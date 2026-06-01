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

// Umami /stats geeft afhankelijk van versie / parameters twee shapes:
//   1. { pageviews: 100, visitors: 50, ... }       (plat, geen prev)
//   2. { pageviews: { value: 100, prev: 80 }, ... } (met comparison)
// We normaliseren naar nummers in de route handler.
export type StatsField = number | { value: number; prev: number }
export interface UmamiStats {
  pageviews: StatsField
  visitors: StatsField
  visits: StatsField
  bouncerate: StatsField
  totaltime: StatsField
}

// Pak het huidige getal uit een StatsField (werkt voor beide shapes).
export function statValue(v: StatsField | undefined): number {
  if (v === undefined || v === null) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'object' && 'value' in v && typeof v.value === 'number') return v.value
  return 0
}

// Pak het vorige-periode getal uit een StatsField (alleen aanwezig in shape 2).
export function statPrev(v: StatsField | undefined): number {
  if (v && typeof v === 'object' && 'prev' in v && typeof v.prev === 'number') return v.prev
  return 0
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

