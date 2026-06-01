'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type KpiBlock = {
  filteredVisitors: number
  totalVisitors: number
  prevVisitors: number
  totalPageviews: number
  prevPageviews: number
  rest: number
}
type Session = {
  id: string
  hostname?: string
  browser?: string
  os?: string
  device?: string
  country?: string
  region?: string
  city?: string
  firstAt?: string
  lastAt?: string
  views?: number
  events?: number
  totaltime?: number
}
type Metric = { x: string; y: number }
type ChartPoint = { x: string; y: number }
type StatsData = {
  generatedAt: string
  kpi: {
    today: KpiBlock
    sevenDays: KpiBlock
    thirtyDays: KpiBlock
  }
  chart: {
    pageviews: ChartPoint[]
    sessions: ChartPoint[]
    note: string
  }
  sessions: Session[]
  events: Metric[]
  countryBreakdown30d: Metric[]
  ghost: {
    visitors: number
    totalVisitors: number
  }
}

const COLORS = {
  green: '#053221',
  greenDeep: '#032a1c',
  gold: '#c8a96e',
  light: '#e8ede9',
  white: '#fff',
  gray: '#4a6358',
  alert: '#a05a5a',
}

function formatDate(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'zojuist'
  if (diffMin < 60) return `${diffMin} min geleden`
  const diffHr = Math.floor(diffMin / 60)
  const sameDay =
    d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  if (sameDay) return `vandaag ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`
  const yest = new Date(now)
  yest.setDate(yest.getDate() - 1)
  const isYesterday =
    d.getDate() === yest.getDate() && d.getMonth() === yest.getMonth() && d.getFullYear() === yest.getFullYear()
  if (isYesterday) return `gisteren ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`
  if (diffHr < 168) return `${Math.floor(diffHr / 24)} dagen geleden`
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds || seconds < 1) return '< 1s'
  if (seconds < 60) return `${Math.floor(seconds)}s`
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}m ${sec}s`
}

function trendPct(value: number, prev: number): number | null {
  if (!prev) return null
  return ((value - prev) / prev) * 100
}

function TrendArrow({ value, prev }: { value: number; prev: number }) {
  const pct = trendPct(value, prev)
  if (pct === null) return <span className="text-xs" style={{ color: COLORS.gray }}>nieuw</span>
  const up = pct > 0
  const flat = Math.abs(pct) < 1
  const arrow = flat ? '→' : up ? '↑' : '↓'
  const color = flat ? COLORS.gray : up ? '#3a7a4a' : COLORS.alert
  return (
    <span className="text-xs font-medium" style={{ color }}>
      {arrow} {Math.abs(pct).toFixed(0)}%
    </span>
  )
}

function KpiTile({
  label,
  kpi,
  highlight,
}: {
  label: string
  kpi: KpiBlock
  highlight?: boolean
}) {
  const dim = highlight ? 'rgba(200,169,110,0.7)' : COLORS.gray
  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-2"
      style={{
        backgroundColor: highlight ? COLORS.green : COLORS.white,
        color: highlight ? COLORS.gold : COLORS.green,
        border: `1px solid ${highlight ? COLORS.green : 'rgba(200,169,110,0.3)'}`,
      }}
    >
      <p className="text-[10px] tracking-widest uppercase" style={{ color: dim }}>
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span
          className="text-3xl font-light"
          style={{ fontFamily: 'var(--font-jost), sans-serif' }}
        >
          {kpi.filteredVisitors}
        </span>
        <span className="text-xs" style={{ color: dim }}>
          bezoekers NL/BE/DE
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: dim }}>
          {kpi.totalPageviews} pageviews tot.
        </span>
        <TrendArrow value={kpi.totalVisitors} prev={kpi.prevVisitors} />
      </div>
      {kpi.totalVisitors > kpi.filteredVisitors && (
        <p className="text-[10px]" style={{ color: dim }}>
          {kpi.totalVisitors} ongefilterd · {kpi.rest} buiten NL/BE/DE
        </p>
      )}
    </div>
  )
}

// HTML bargrafiek (geen SVG-stretching meer). Bars als flex divs,
// hoogte in percentage. Labels onder eens in de zoveel bars, mobiel-vriendelijk.
function BarChart({ points }: { points: ChartPoint[] }) {
  if (points.length === 0) {
    return (
      <div
        className="rounded-lg p-8 text-center text-sm"
        style={{ backgroundColor: COLORS.white, color: COLORS.gray, border: `1px solid rgba(200,169,110,0.3)` }}
      >
        Nog geen data voor de grafiek.
      </div>
    )
  }

  const max = Math.max(...points.map(p => p.y), 1)
  // Toon ongeveer 5 labels onder de grafiek (begin, 25%, 50%, 75%, eind)
  const labelEvery = Math.max(1, Math.ceil(points.length / 5))

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: COLORS.white, border: `1px solid rgba(200,169,110,0.3)` }}
    >
      <div
        className="flex items-end gap-[2px]"
        style={{ height: '140px' }}
      >
        {points.map(p => {
          const heightPct = max > 0 ? (p.y / max) * 100 : 0
          const dateLabel = new Date(p.x).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
          return (
            <div
              key={p.x}
              className="flex-1 rounded-t"
              style={{
                height: `${Math.max(heightPct, 1)}%`,
                backgroundColor: COLORS.gold,
                opacity: p.y > 0 ? 0.85 : 0.15,
                minHeight: p.y > 0 ? '2px' : '1px',
              }}
              title={`${dateLabel}: ${p.y} pageviews`}
            />
          )
        })}
      </div>
      <div className="flex gap-[2px] mt-2">
        {points.map((p, i) => {
          const showLabel = i % labelEvery === 0 || i === points.length - 1
          return (
            <div key={`l-${p.x}`} className="flex-1 text-center">
              {showLabel && (
                <span className="text-[10px]" style={{ color: COLORS.gray }}>
                  {new Date(p.x).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SessionCard({ s }: { s: Session }) {
  const [expanded, setExpanded] = useState(false)
  const locale = [s.city, s.country].filter(Boolean).join(', ') || 'onbekend'
  return (
    <div
      className="rounded-lg p-3"
      style={{ backgroundColor: COLORS.white, border: '1px solid rgba(200,169,110,0.3)' }}
    >
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium" style={{ color: COLORS.green }}>
            {locale}
          </p>
          <p className="text-xs mt-0.5" style={{ color: COLORS.gray }}>
            {formatDate(s.lastAt || s.firstAt)}
            {s.views !== undefined && ` · ${s.views} pageview${s.views !== 1 ? 's' : ''}`}
            {s.events !== undefined && s.events > 0 && ` · ${s.events} event${s.events !== 1 ? 's' : ''}`}
            {s.totaltime !== undefined && s.totaltime > 0 && ` · ${formatDuration(s.totaltime)}`}
          </p>
        </div>
        <span
          className="text-xs flex-shrink-0"
          style={{ color: COLORS.gold }}
        >
          {expanded ? '−' : '+'}
        </span>
      </button>
      {expanded && (
        <div className="mt-3 pt-3 text-xs space-y-1" style={{ borderTop: '1px solid rgba(200,169,110,0.2)', color: COLORS.gray }}>
          <p>
            <strong style={{ color: COLORS.green }}>Apparaat:</strong>{' '}
            {[s.device, s.browser, s.os].filter(Boolean).join(' · ') || 'onbekend'}
          </p>
          {s.region && (
            <p>
              <strong style={{ color: COLORS.green }}>Regio:</strong> {s.region}
            </p>
          )}
          <p>
            <strong style={{ color: COLORS.green }}>Sessie-ID:</strong>{' '}
            <span className="font-mono">{s.id.slice(0, 12)}...</span>
          </p>
          <p className="opacity-60">
            Voor de volledige pagina-volgorde van deze sessie, open Umami zelf.
          </p>
        </div>
      )}
    </div>
  )
}

export default function AdminStatsPage() {
  const router = useRouter()
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAllSessions, setShowAllSessions] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/stats', { cache: 'no-store' })
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          setError(d?.error || `Fout ${res.status}`)
          setLoading(false)
          return
        }
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error('Stats load error:', err)
        setError(err instanceof Error ? err.message : 'Onbekende fout')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const visibleSessions = useMemo(() => {
    if (!data) return []
    return showAllSessions ? data.sessions : data.sessions.slice(0, 20)
  }, [data, showAllSessions])

  return (
    <main className="min-h-screen" style={{ backgroundColor: COLORS.light }}>
      {/* Header */}
      <header
        className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={{ backgroundColor: COLORS.green }}
      >
        <div className="flex items-center gap-3">
          <Image src="/logoBJAYv3.0-iconbackground.png" alt="Bjay.photo" width={32} height={32} />
          <h1
            className="text-xl font-bold tracking-widest uppercase"
            style={{ color: COLORS.gold, fontFamily: 'var(--font-jost), sans-serif' }}
          >
            Bjay.photo
          </h1>
          <span className="text-xs tracking-widest uppercase" style={{ color: 'rgba(200,169,110,0.5)' }}>
            / Stats
          </span>
        </div>
        <button
          onClick={() => router.push('/admin/dashboard')}
          className="text-sm transition hover:opacity-70 self-start sm:self-auto"
          style={{ color: 'rgba(232,237,233,0.6)' }}
        >
          ← Dashboard
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6">
        {loading ? (
          <p style={{ color: COLORS.gray }}>Stats ophalen...</p>
        ) : error ? (
          <div className="rounded-lg p-4" style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.alert}` }}>
            <p className="text-sm font-medium" style={{ color: COLORS.alert }}>Kon stats niet laden</p>
            <p className="text-xs mt-1" style={{ color: COLORS.gray }}>{error}</p>
            <p className="text-xs mt-2" style={{ color: COLORS.gray }}>
              Check of <code>UMAMI_API_TOKEN</code> en <code>UMAMI_WEBSITE_ID</code> goed staan in Vercel.
            </p>
          </div>
        ) : data ? (
          <>
            {/* Intro */}
            <div>
              <h2 className="text-lg font-light tracking-wide" style={{ color: COLORS.green }}>
                Stats van bjay.photo
              </h2>
              <p className="text-xs mt-1" style={{ color: COLORS.gray }}>
                Gefilterd op NL, BE en DE. De rest van de wereld zie je onderaan bij &apos;spookverkeer&apos;.
                Data vernieuwt om de 60 sec.
              </p>
            </div>

            {/* KPI-tegels */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <KpiTile label="Vandaag" kpi={data.kpi.today} highlight />
              <KpiTile label="Laatste 7 dagen" kpi={data.kpi.sevenDays} />
              <KpiTile label="Laatste 30 dagen" kpi={data.kpi.thirtyDays} />
            </section>

            {/* 30-dagen grafiek */}
            <section>
              <h3 className="text-sm font-medium tracking-widest uppercase mb-2" style={{ color: COLORS.gold }}>
                Pageviews per dag (30d, NL)
              </h3>
              <BarChart points={data.chart.pageviews} />
              <p className="text-[10px] mt-2" style={{ color: COLORS.gray }}>
                {data.chart.note}
              </p>
            </section>

            {/* Activity feed */}
            <section>
              <h3 className="text-sm font-medium tracking-widest uppercase mb-3" style={{ color: COLORS.gold }}>
                Laatste sessies ({data.sessions.length})
              </h3>
              {data.sessions.length === 0 ? (
                <div
                  className="rounded-lg p-4 text-sm"
                  style={{ backgroundColor: COLORS.white, color: COLORS.gray, border: '1px solid rgba(200,169,110,0.3)' }}
                >
                  Nog geen sessies in de laatste 7 dagen.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {visibleSessions.map(s => (
                    <SessionCard key={s.id} s={s} />
                  ))}
                  {data.sessions.length > visibleSessions.length && (
                    <button
                      onClick={() => setShowAllSessions(true)}
                      className="rounded-lg p-3 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
                      style={{ border: `1px solid ${COLORS.gold}`, color: COLORS.gold, backgroundColor: COLORS.white }}
                    >
                      Laad meer ({data.sessions.length - visibleSessions.length})
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Events */}
            <section>
              <h3 className="text-sm font-medium tracking-widest uppercase mb-3" style={{ color: COLORS.gold }}>
                Custom events (30d, ongefilterd)
              </h3>
              {data.events.length === 0 ? (
                <div
                  className="rounded-lg p-4 text-sm"
                  style={{ backgroundColor: COLORS.white, color: COLORS.gray, border: '1px solid rgba(200,169,110,0.3)' }}
                >
                  Geen events geregistreerd. Check of je tracking-code goed staat.
                </div>
              ) : (
                <div
                  className="rounded-lg overflow-hidden"
                  style={{ backgroundColor: COLORS.white, border: '1px solid rgba(200,169,110,0.3)' }}
                >
                  {data.events
                    .slice()
                    .sort((a, b) => b.y - a.y)
                    .map((e, i) => (
                      <div
                        key={e.x}
                        className="px-3 py-2 flex items-center justify-between gap-3"
                        style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(200,169,110,0.15)' }}
                      >
                        <span className="text-sm font-mono" style={{ color: COLORS.green }}>
                          {e.x}
                        </span>
                        <span className="text-sm" style={{ color: COLORS.gold }}>
                          {e.y}x
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </section>

            {/* Spookverkeer */}
            <section>
              <h3 className="text-sm font-medium tracking-widest uppercase mb-3" style={{ color: COLORS.gold }}>
                Spookverkeer (rest van de wereld, 30d)
              </h3>
              <div
                className="rounded-lg p-4 flex flex-wrap items-center justify-between gap-4"
                style={{ backgroundColor: COLORS.white, border: '1px solid rgba(200,169,110,0.3)' }}
              >
                <div>
                  <p className="text-2xl font-light" style={{ color: COLORS.gray, fontFamily: 'var(--font-jost), sans-serif' }}>
                    {data.ghost.visitors}
                  </p>
                  <p className="text-xs mt-1" style={{ color: COLORS.gray }}>
                    bezoekers buiten NL/BE/DE
                  </p>
                </div>
                <div className="text-xs text-right" style={{ color: COLORS.gray }}>
                  <p>{data.ghost.totalVisitors} totaal (alle landen)</p>
                  <p className="opacity-70">
                    {data.ghost.totalVisitors > 0
                      ? Math.round((data.ghost.visitors / data.ghost.totalVisitors) * 100)
                      : 0}
                    % van totaal
                  </p>
                </div>
              </div>
              <p className="text-[10px] mt-2" style={{ color: COLORS.gray }}>
                Meestal bots en scrapers. Hou dit in de gaten — als het ineens spikes, dan zit er wat scheef.
              </p>
            </section>

            <p className="text-[10px] mt-2 text-right" style={{ color: COLORS.gray }}>
              Laatst opgehaald: {new Date(data.generatedAt).toLocaleTimeString('nl-NL')}
            </p>
          </>
        ) : null}
      </div>
    </main>
  )
}
