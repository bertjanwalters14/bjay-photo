'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { formatEuros } from '@/lib/format'

interface MonthBucket {
  month: string
  orders: number
  personal: number
  total: number
}

interface RevenueData {
  total: number
  totalThisYear: number
  orders: { total: number; count: number }
  personal: { total: number; count: number }
  outstanding: { total: number; count: number; items: { code: string; name: string; amount: number }[] }
  byMonth: MonthBucket[]
}

const MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  const idx = parseInt(month, 10) - 1
  return `${MONTH_NAMES[idx] ?? month} ${year}`
}

export default function AdminRevenuePage() {
  const router = useRouter()
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/revenue')
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      try {
        setData(await res.json())
      } catch {
        setData(null)
      }
      setLoading(false)
    }
    load()
  }, [router])

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#e8ede9' }}>
      <header className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#053221' }}>
        <div className="flex items-center gap-3">
          <Image src="/logoBJAYv3.0-iconbackground.png" alt="Bjay.photo" width={32} height={32} />
          <h1
            className="text-xl font-bold tracking-widest uppercase"
            style={{ color: '#c8a96e', fontFamily: 'var(--font-jost), sans-serif' }}
          >
            Bjay.photo
          </h1>
          <span className="text-xs tracking-widest uppercase" style={{ color: 'rgba(200,169,110,0.5)' }}>
            / Omzet
          </span>
        </div>
        <button
          onClick={() => router.push('/admin/dashboard')}
          className="text-sm transition hover:opacity-70"
          style={{ color: 'rgba(232,237,233,0.6)' }}
        >
          Dashboard
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
        {loading ? (
          <p style={{ color: '#4a6358' }}>Laden...</p>
        ) : !data ? (
          <p style={{ color: '#4a6358' }}>Kon de omzet niet laden.</p>
        ) : (
          <>
            {/* Hoofd-totalen */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                className="rounded-lg p-6 flex flex-col gap-1"
                style={{ backgroundColor: '#053221', border: '1px solid rgba(200,169,110,0.3)' }}
              >
                <span className="text-xs tracking-widest uppercase" style={{ color: 'rgba(200,169,110,0.7)' }}>
                  Totaal ontvangen
                </span>
                <span className="text-3xl font-bold" style={{ color: '#c8a96e' }}>
                  {formatEuros(data.total)}
                </span>
              </div>
              <div
                className="rounded-lg p-6 flex flex-col gap-1"
                style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
              >
                <span className="text-xs tracking-widest uppercase" style={{ color: '#4a6358' }}>
                  Dit jaar
                </span>
                <span className="text-3xl font-bold" style={{ color: '#053221' }}>
                  {formatEuros(data.totalThisYear)}
                </span>
              </div>
            </div>

            {/* Verdeling bron */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                className="rounded-lg p-4 flex flex-col gap-1"
                style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
              >
                <span className="text-xs tracking-widest uppercase" style={{ color: '#4a6358' }}>
                  Bestellingen (betaald/verzonden)
                </span>
                <span className="text-xl font-medium" style={{ color: '#053221' }}>
                  {formatEuros(data.orders.total)}
                </span>
                <span className="text-xs" style={{ color: 'rgba(74,99,88,0.7)' }}>
                  {data.orders.count} bestelling{data.orders.count !== 1 ? 'en' : ''}
                </span>
              </div>
              <div
                className="rounded-lg p-4 flex flex-col gap-1"
                style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
              >
                <span className="text-xs tracking-widest uppercase" style={{ color: '#4a6358' }}>
                  Personal shoots (betaald)
                </span>
                <span className="text-xl font-medium" style={{ color: '#053221' }}>
                  {formatEuros(data.personal.total)}
                </span>
                <span className="text-xs" style={{ color: 'rgba(74,99,88,0.7)' }}>
                  {data.personal.count} shoot{data.personal.count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Per maand */}
            <div
              className="rounded-lg overflow-hidden"
              style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
            >
              <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(200,169,110,0.3)' }}>
                <span className="text-xs tracking-widest uppercase" style={{ color: '#4a6358' }}>
                  Per maand
                </span>
              </div>
              {data.byMonth.length === 0 ? (
                <p className="px-4 py-6 text-sm" style={{ color: '#4a6358' }}>
                  Nog geen ontvangen omzet. Zet bestellingen op &lsquo;betaald&rsquo; of markeer personal shoots als betaald.
                </p>
              ) : (
                <div className="flex flex-col">
                  {data.byMonth.map(m => (
                    <div
                      key={m.month}
                      className="px-4 py-3 flex items-center justify-between"
                      style={{ borderTop: '1px solid rgba(200,169,110,0.15)' }}
                    >
                      <span className="text-sm" style={{ color: '#053221' }}>
                        {monthLabel(m.month)}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs" style={{ color: 'rgba(74,99,88,0.7)' }}>
                          {m.orders > 0 && <>orders {formatEuros(m.orders)}</>}
                          {m.orders > 0 && m.personal > 0 && ' · '}
                          {m.personal > 0 && <>personal {formatEuros(m.personal)}</>}
                        </span>
                        <span className="text-sm font-medium" style={{ color: '#053221' }}>
                          {formatEuros(m.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Openstaand (informatief) — klikbaar naar de shoot */}
            {data.outstanding.count > 0 && (
              <div
                className="rounded-lg p-4 flex flex-col gap-3"
                style={{ backgroundColor: 'rgba(200,169,110,0.1)', border: '1px dashed rgba(200,169,110,0.5)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs tracking-widest uppercase" style={{ color: '#4a6358' }}>
                      Nog openstaand (personal)
                    </span>
                    <span className="text-xs" style={{ color: 'rgba(74,99,88,0.7)' }}>
                      {data.outstanding.count} shoot{data.outstanding.count !== 1 ? 's' : ''} met bedrag, nog niet als betaald gemarkeerd
                    </span>
                  </div>
                  <span className="text-lg font-medium" style={{ color: '#c8a96e' }}>
                    {formatEuros(data.outstanding.total)}
                  </span>
                </div>
                <div className="flex flex-col">
                  {data.outstanding.items.map(item => (
                    <button
                      key={item.code}
                      onClick={() => router.push(`/admin/clients/${item.code}`)}
                      className="px-2 py-2 flex items-center justify-between text-left transition hover:opacity-70"
                      style={{ borderTop: '1px solid rgba(200,169,110,0.3)' }}
                    >
                      <span className="text-sm underline" style={{ color: '#053221' }}>
                        {item.name}
                      </span>
                      <span className="text-sm" style={{ color: '#4a6358' }}>
                        {formatEuros(item.amount)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
