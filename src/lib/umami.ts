import redis from '@/lib/redis'

// Typed wrapper rond Umami Cloud API (api.umami.is). Alle calls server-side,
// token komt uit env. Optionele Redis-cache laag met TTL.

const API_HOST = process.env.UMAMI_API_HOST || 'https://api.umami.is'
const API_TOKEN = process.env.UMAMI_API_TOKEN
const WEBSITE_ID = process.env.UMAMI_WEBSITE_ID

const CACHE_TTL = 60 // seconden

export const COUNTRIES = ['NL', 'BE', 'DE'] as const
export type SupportedCountry = (typeof COUNTRIES)[number]

export interface UmamiSession {
  id: string
  websiteId: string
  hostname?: string
  browser?: string
  os?: string
  device?: string
  screen?: string
  language?: string
  country?: string
  region?: string
  city?: string
  firstAt?: string
  lastAt?: string
  visits?: number
  views?: number
  events?: number
  totaltime?: number
  createdAt?: string
}

export interface UmamiSessionActivity {
  websiteId: string
  sessionId: string
  createdAt: string
  urlPath?: string
  urlQuery?: string | null
  referrerDomain?: string | null
  eventName?: string | null
  eventId?: string
}

export interface UmamiMetric {
  x: string
  y: number
}

export interface UmamiPageviews {
  pageviews: UmamiMetric[]
  sessions: UmamiMetric[]
}

export interface UmamiStats {
  pageviews: { value: number; prev: number }
  visitors: { value: number; prev: number }
  visits: { value: number; prev: number }
  bouncerate: { value: number; prev: number }
  totaltime: { value: number; prev: number }
}

class UmamiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function umamiFetch<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  if (!API_TOKEN || !WEBSITE_ID) {
    throw new UmamiError(500, 'UMAMI_API_TOKEN of UMAMI_WEBSITE_ID ontbreekt in env')
  }

  const url = new URL(`${API_HOST}/v1/websites/${WEBSITE_ID}${path}`)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
  }

  const res = await fetch(url.toString(), {
    headers: { 'x-umami-api-key': API_TOKEN, 'Authorization': `Bearer ${API_TOKEN}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new UmamiError(res.status, `Umami API ${res.status}: ${body.slice(0, 200)}`)
  }

  return res.json() as Promise<T>
}

// Cache-wrapper. Best-effort: bij Redis-fout val terug op directe call.
async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get<T>(`umami:${key}`)
    if (hit) return hit
  } catch {
    // Redis down, just refetch
  }
  const fresh = await fetcher()
  try {
    await redis.set(`umami:${key}`, fresh, { ex: CACHE_TTL })
  } catch {
    // ok
  }
  return fresh
}

// ===== Public API =====

// Stats-tegels (pageviews/visitors/etc) met vergelijking t.o.v. vorige periode.
export async function getStats(startAt: number, endAt: number, country?: string): Promise<UmamiStats> {
  const key = `stats:${startAt}:${endAt}:${country || 'all'}`
  return cached(key, () =>
    umamiFetch<UmamiStats>('/stats', { startAt, endAt, country }),
  )
}

// Pageviews-timeseries (dagelijkse buckets voor de grafiek).
export async function getPageviewsTimeseries(
  startAt: number,
  endAt: number,
  country?: string,
  unit: 'hour' | 'day' = 'day',
  timezone = 'Europe/Amsterdam',
): Promise<UmamiPageviews> {
  const key = `pv:${startAt}:${endAt}:${unit}:${country || 'all'}`
  return cached(key, () =>
    umamiFetch<UmamiPageviews>('/pageviews', { startAt, endAt, country, unit, timezone }),
  )
}

// Metrics breakdown: type=url voor top pagina's, type=event voor custom events, etc.
export async function getMetrics(
  startAt: number,
  endAt: number,
  type: 'url' | 'referrer' | 'browser' | 'os' | 'device' | 'country' | 'region' | 'city' | 'event',
  country?: string,
  limit = 50,
): Promise<UmamiMetric[]> {
  const key = `metrics:${type}:${startAt}:${endAt}:${country || 'all'}:${limit}`
  return cached(key, () =>
    umamiFetch<UmamiMetric[]>('/metrics', { startAt, endAt, type, country, limit }),
  )
}

// Sessies-lijst (paginated, met country filter). Umami v2+ ondersteunt
// paging via 'pageSize' en 'page'. Geen client-side filtering nodig.
export interface UmamiSessionsResponse {
  data: UmamiSession[]
  count: number
  pageSize: number
  page: number
  orderBy?: string
}

export async function getSessions(
  startAt: number,
  endAt: number,
  options: { country?: string; pageSize?: number; page?: number } = {},
): Promise<UmamiSessionsResponse> {
  const { country, pageSize = 50, page = 1 } = options
  const key = `sessions:${startAt}:${endAt}:${country || 'all'}:${page}:${pageSize}`
  return cached(key, () =>
    umamiFetch<UmamiSessionsResponse>('/sessions', { startAt, endAt, country, pageSize, page }),
  )
}

// Activity (pageviews + events) voor een specifieke sessie. Niet gecached.
export async function getSessionActivity(
  sessionId: string,
  startAt: number,
  endAt: number,
): Promise<UmamiSessionActivity[]> {
  return umamiFetch<UmamiSessionActivity[]>(`/sessions/${sessionId}/activity`, { startAt, endAt })
}

// Helper: parallel ophalen voor meerdere landen en optellen.
export async function getStatsMultiCountry(
  startAt: number,
  endAt: number,
  countries: readonly string[],
): Promise<UmamiStats> {
  const results = await Promise.all(countries.map(c => getStats(startAt, endAt, c)))
  const sum: UmamiStats = {
    pageviews: { value: 0, prev: 0 },
    visitors: { value: 0, prev: 0 },
    visits: { value: 0, prev: 0 },
    bouncerate: { value: 0, prev: 0 },
    totaltime: { value: 0, prev: 0 },
  }
  for (const r of results) {
    sum.pageviews.value += r.pageviews?.value || 0
    sum.pageviews.prev += r.pageviews?.prev || 0
    sum.visitors.value += r.visitors?.value || 0
    sum.visitors.prev += r.visitors?.prev || 0
    sum.visits.value += r.visits?.value || 0
    sum.visits.prev += r.visits?.prev || 0
    // bouncerate en totaltime middelen we niet, niet zinvol om op te tellen
  }
  return sum
}
