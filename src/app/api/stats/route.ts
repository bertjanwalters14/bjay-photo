import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import {
  COUNTRIES,
  getMetrics,
  getPageviewsTimeseries,
  getSessions,
  getStats,
  getStatsMultiCountry,
  type UmamiSession,
} from '@/lib/umami'

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
    // Parallel ophalen — Umami v1 API endpoint paths.
    const [
      statsToday,
      stats7d,
      stats30d,
      statsAll30d,
      pageviewsTs,
      sessionsResp,
      events30d,
    ] = await Promise.all([
      getStatsMultiCountry(todayStart, now, COUNTRIES),
      getStatsMultiCountry(sevenStart, now, COUNTRIES),
      getStatsMultiCountry(thirtyStart, now, COUNTRIES),
      // Voor spookverkeer-tegel: ongefilterd totaal
      getStats(thirtyStart, now),
      // Grafiek: dagelijkse pageviews/sessies, 30 dagen, NL only (Umami pageviews
      // ondersteunt 1 country tegelijk; we tonen alleen NL als grootste signaal).
      // Voor multi-country graph zouden 3 calls + merge nodig zijn.
      getPageviewsTimeseries(thirtyStart, now, 'NL', 'day'),
      // 50 nieuwste sessies (NL+BE+DE). Helaas filtert /sessions maar op 1 country
      // tegelijk; we trekken 3 keer en mergen client-side.
      Promise.all(COUNTRIES.map(c => getSessions(sevenStart, now, { country: c, pageSize: 50 }))),
      // Events-overzicht (30d, ongefilterd op land — events zijn user-actions,
      // dus we willen ze juist ongeacht waar de visitor vandaan kwam zien)
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

    // Spookverkeer: totaal_visitors_30d - filtered_visitors_30d
    const ghostVisitors = Math.max(
      0,
      (statsAll30d.visitors?.value || 0) - (stats30d.visitors?.value || 0),
    )
    const ghostPageviews = Math.max(
      0,
      (statsAll30d.pageviews?.value || 0) - (stats30d.pageviews?.value || 0),
    )

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      kpi: {
        today: statsToday,
        sevenDays: stats7d,
        thirtyDays: stats30d,
      },
      chart: {
        // Dagelijkse buckets voor de grafiek
        pageviews: pageviewsTs.pageviews || [],
        sessions: pageviewsTs.sessions || [],
        note: 'Grafiek toont alleen NL (grootste publiek). BE+DE samen <10% van traffic.',
      },
      sessions: recentSessions,
      events: events30d,
      ghost: {
        visitors: ghostVisitors,
        pageviews: ghostPageviews,
        totalVisitors: statsAll30d.visitors?.value || 0,
        totalPageviews: statsAll30d.pageviews?.value || 0,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    console.error('Stats route error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
