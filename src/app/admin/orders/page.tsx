'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { Order, OrderStatus } from '@/lib/types'

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Nieuw',
  contacted: 'Contact opgenomen',
  paid: 'Betaald',
  shipped: 'Verzonden',
  cancelled: 'Geannuleerd',
}

const STATUS_COLORS: Record<OrderStatus, { bg: string; fg: string; border: string }> = {
  new: { bg: 'rgba(200,169,110,0.15)', fg: '#c8a96e', border: 'rgba(200,169,110,0.4)' },
  contacted: { bg: 'rgba(74,99,88,0.15)', fg: '#4a6358', border: 'rgba(74,99,88,0.4)' },
  paid: { bg: 'rgba(34,139,34,0.15)', fg: '#2d8a3e', border: 'rgba(45,138,62,0.4)' },
  shipped: { bg: 'rgba(5,50,33,0.1)', fg: '#053221', border: 'rgba(5,50,33,0.3)' },
  cancelled: { bg: 'rgba(160,90,90,0.15)', fg: '#a05a5a', border: 'rgba(160,90,90,0.3)' },
}

const STATUS_ORDER: OrderStatus[] = ['new', 'contacted', 'paid', 'shipped', 'cancelled']

export default function AdminOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [updating, setUpdating] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/orders')
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      try {
        const data = await res.json()
        setOrders(data.orders || [])
      } catch {
        setOrders([])
      }
      setLoading(false)
    }
    load()
  }, [router])

  const filtered = useMemo(() => {
    if (filter === 'all') return orders
    return orders.filter(o => o.status === filter)
  }, [orders, filter])

  const counts = useMemo(() => {
    const c: Record<OrderStatus | 'all', number> = {
      all: orders.length,
      new: 0,
      contacted: 0,
      paid: 0,
      shipped: 0,
      cancelled: 0,
    }
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1
    return c
  }, [orders])

  async function updateStatus(orderId: string, status: OrderStatus) {
    setUpdating(prev => ({ ...prev, [orderId]: true }))
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const data = await res.json()
      setOrders(prev => prev.map(o => (o.id === orderId ? data.order : o)))
    }
    setUpdating(prev => ({ ...prev, [orderId]: false }))
  }

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
          <span
            className="text-xs tracking-widest uppercase"
            style={{ color: 'rgba(200,169,110,0.5)' }}
          >
            / Bestellingen
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
        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {(['all', ...STATUS_ORDER] as const).map(key => {
            const active = filter === key
            const label = key === 'all' ? 'Alles' : STATUS_LABELS[key]
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="px-3 py-1.5 text-xs tracking-widest uppercase transition"
                style={{
                  backgroundColor: active ? '#053221' : '#fff',
                  color: active ? '#c8a96e' : '#053221',
                  border: '1px solid rgba(200,169,110,0.4)',
                  borderRadius: '999px',
                }}
              >
                {label} ({counts[key]})
              </button>
            )
          })}
        </div>

        {loading ? (
          <p style={{ color: '#4a6358' }}>Laden...</p>
        ) : filtered.length === 0 ? (
          <div
            className="rounded-lg p-8 text-center"
            style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
          >
            <p style={{ color: '#4a6358' }}>
              {filter === 'all' ? 'Nog geen bestellingen.' : 'Geen bestellingen in deze categorie.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(order => (
              <div
                key={order.id}
                className="rounded-lg p-4 flex flex-col sm:flex-row gap-4"
                style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
              >
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={order.photoUrl}
                  alt=""
                  className="w-24 h-24 object-cover rounded flex-shrink-0"
                />

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium" style={{ color: '#053221' }}>
                      {order.customerName || '(geen naam)'}
                    </span>
                    {order.customerEmail && (
                      <a
                        href={`mailto:${order.customerEmail}?subject=Jouw fotobestelling bij Bjay.photo`}
                        className="text-xs underline"
                        style={{ color: '#c8a96e' }}
                      >
                        {order.customerEmail}
                      </a>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: '#4a6358' }}>
                    Portaal:{' '}
                    <button
                      onClick={() => router.push(`/admin/clients/${order.clientCode}`)}
                      className="underline"
                      style={{ color: '#053221' }}
                    >
                      {order.clientName}
                    </button>
                  </p>
                  <p className="text-sm" style={{ color: '#4a6358' }}>
                    Formaat: <span style={{ color: '#053221' }}>{order.format}</span>
                    {' · '}
                    Prijs: <span style={{ color: '#053221' }}>{order.price}</span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(74,99,88,0.7)' }}>
                    {new Date(order.createdAt).toLocaleString('nl-NL')}
                    {order.updatedAt !== order.createdAt && (
                      <> · gewijzigd {new Date(order.updatedAt).toLocaleString('nl-NL')}</>
                    )}
                  </p>
                </div>

                {/* Status */}
                <div className="flex flex-col items-start sm:items-end gap-2">
                  <span
                    className="text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: STATUS_COLORS[order.status].bg,
                      color: STATUS_COLORS[order.status].fg,
                      border: `1px solid ${STATUS_COLORS[order.status].border}`,
                    }}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                  <select
                    value={order.status}
                    disabled={updating[order.id]}
                    onChange={e => updateStatus(order.id, e.target.value as OrderStatus)}
                    className="text-xs px-2 py-1 focus:outline-none"
                    style={{
                      backgroundColor: '#fff',
                      color: '#053221',
                      border: '1px solid rgba(200,169,110,0.4)',
                    }}
                  >
                    {STATUS_ORDER.map(s => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
