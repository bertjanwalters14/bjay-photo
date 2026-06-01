import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import {
  COUNTRIES,
  getMetrics,
  getPageviewsTimeseries,
  getSessions,
  getStats,
  type SupportedCountry,
  type UmamiMetric,
  type UmamiSession,
} from '@/lib/umami'

// Som de visitors op uit /metrics?type=country voor onze drie landen.
// Umami's /stats endpoint respecteert de country-filter onbetrouwbaar,
// daarom rollen we de KPI's op via de country-breakdown.
function sumFilteredVisitors(breakdown: UmamiMetric[]): number {
  return breakdown
    .filter(m => COUNTRIES.includes(m.x as SupportedCountry))
    .reduce((s, m) => s + (m.y || 0), 0)
}

function sumRestVisitors(breakdown: UmamiMetric[]): number {
  return breakdown
    .filter(m => !COUNTRIES.includes(m.x as SupportedCountry))
    .reduce((s, m) => s + (m.y || 0), 0)
}

// Helper: bepaal start/end timestamps voor een aantal "vandaag" / "X dagen geleden"
function rangeForDays(days: number, now = Date.now()) {
  const end = now
  const start = end - days * 24 * 60 * 60 * 1000
  return { start, end }
}

function startOfTodayNL(now = new Date()): number {
  // Pragmatisch: gebruik UTC midnight als benadering. Voor exact NL-tijd
  // zou je tz-aware libs nodig hebben — voor dashboard-doeleinden volstaat dit.
  const d = new Date(now)
  d.setUTCHours(0, 0, 0, 0)
  return d.getTime()
}

export async function GET(_req: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const now = Date.now()
  const todayStart = startOfTodayNL(new Date(now))
  const sevenStart = now - 7 * 24 * 60 * 60 * 1000
  const thirtyStart = now - 30 * 24 * 60 * 60 * 1000

  try {
    // Parallel ophalen. We gebruiken /stats voor totale visitors+pageviews
    // en prev-period (voor trend), en /metrics?type=country voor de
    // per-land breakdown (waaruit we de NL+BE+DE filter berekenen).
    const [
      statsTodayAll,
      stats7dAll,
      stats30dAll,
      countryToday,
      country7d,
      country30d,
      pageviewsTs,
      sessionsResp,
      events30d,
    ] = await Promise.all([
      getStats(todayStart, now),
      getStats(sevenStart, now),
      getStats(thirtyStart, now),
      getMetrics(todayStart, now, 'country', undefined, 50),
      getMetrics(sevenStart, now, 'country', undefined, 50),
      getMetrics(thirtyStart, now, 'country', undefined, 50),
      // Grafiek: dagelijkse pageviews. NL only (Umami /pageviews accepteert
      // 1 land tegelijk en NL is verreweg de grootste bron).
      getPageviewsTimeseries(thirtyStart, now, 'NL', 'day'),
      // 50 nieuwste sessies per land, samengevoegd na call
      Promise.all(COUNTRIES.map(c => getSessions(sevenStart, now, { country: c, pageSize: 50 }))),
      // Events 30d ongefilterd op land
      getMetrics(thirtyStart, now, 'event', undefined, 30),
    ])

    // Sessies samenvoegen en sorteren op lastAt desc, top 50
    const allSessions: UmamiSession[] = sessionsResp.flatMap(r => r.data || [])
    allSessions.sort((a, b) => {
      const ta = new Date(a.lastAt || a.firstAt || a.createdAt || 0).getTime()
      const tb = new Date(b.lastAt || b.firstAt || b.createdAt || 0).getTime()
      return tb - ta
    })
    const recentSessions = allSessions.slice(0, 50)

    // Per-periode: filtered visitors (NL+BE+DE) uit metrics, totaal en prev uit /stats
    function buildKpi(stats: typeof statsTodayAll, breakdown: UmamiMetric[]) {
      const filteredVisitors = sumFilteredVisitors(breakdown)
      return {
        filteredVisitors,
        totalVisitors: stats.visitors?.value || 0,
        prevVisitors: stats.visitors?.prev || 0,
        totalPageviews: stats.pageviews?.value || 0,
        prevPageviews: stats.pageviews?.prev || 0,
        rest: sumRestVisitors(breakdown),
      }
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      kpi: {
        today: buildKpi(statsTodayAll, countryToday),
        sevenDays: buildKpi(stats7dAll, country7d),
        thirtyDays: buildKpi(stats30dAll, country30d),
      },
      chart: {
        pageviews: pageviewsTs.pageviews || [],
        sessions: pageviewsTs.sessions || [],
        note: 'Grafiek toont alleen NL (grootste publiek). BE+DE samen <10% van traffic.',
      },
      sessions: recentSessions,
      events: events30d,
      countryBreakdown30d: country30d,
      ghost: {
        visitors: sumRestVisitors(country30d),
        totalVisitors: stats30dAll.visitors?.value || 0,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    console.error('Stats route error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
