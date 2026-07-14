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
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Handmatige bestelling (bv. via WhatsApp/mail tijdens een storing).
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualClientCode, setManualClientCode] = useState('')
  const [manualCustomerName, setManualCustomerName] = useState('')
  const [manualCustomerEmail, setManualCustomerEmail] = useState('')
  const [manualDescription, setManualDescription] = useState('')
  const [manualPrice, setManualPrice] = useState('')
  const [manualStatus, setManualStatus] = useState<OrderStatus>('paid')
  const [manualNotes, setManualNotes] = useState('')
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [manualError, setManualError] = useState('')

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

  async function sendReview(orderId: string) {
    setUpdating(prev => ({ ...prev, [orderId]: true }))
    try {
      const res = await fetch(`/api/orders/${orderId}/review-request`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setOrders(prev => prev.map(o => (o.id === orderId ? data.order : o)))
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data?.error || 'Review-verzoek kon niet verstuurd worden')
      }
    } finally {
      setUpdating(prev => ({ ...prev, [orderId]: false }))
    }
  }

  async function deleteOrder(order: Order) {
    const confirmed = window.confirm(
      `Bestelling van ${order.customerName || '(geen naam)'} verwijderen?\n\n` +
        `Pakket: ${order.format}\n` +
        `Prijs: ${order.price}\n` +
        `Status: ${STATUS_LABELS[order.status]}\n\n` +
        `Dit kan niet ongedaan worden gemaakt.`
    )
    if (!confirmed) return

    setDeletingId(order.id)
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data?.error || 'Verwijderen mislukt')
        return
      }
      setOrders(prev => prev.filter(o => o.id !== order.id))
    } catch (err) {
      console.error('Delete order error:', err)
      alert('Verwijderen mislukt — probeer opnieuw')
    } finally {
      setDeletingId(null)
    }
  }

  async function submitManualOrder(e: React.FormEvent) {
    e.preventDefault()
    setManualSubmitting(true)
    setManualError('')
    try {
      const res = await fetch('/api/orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientCode: manualClientCode,
          customerName: manualCustomerName,
          customerEmail: manualCustomerEmail,
          description: manualDescription,
          price: manualPrice,
          status: manualStatus,
          notes: manualNotes,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setManualError(data?.error || 'Toevoegen mislukt')
        return
      }
      setOrders(prev => [data.order, ...prev])
      setShowManualForm(false)
      setManualClientCode('')
      setManualCustomerName('')
      setManualCustomerEmail('')
      setManualDescription('')
      setManualPrice('')
      setManualStatus('paid')
      setManualNotes('')
    } catch {
      setManualError('Toevoegen mislukt, probeer opnieuw')
    } finally {
      setManualSubmitting(false)
    }
  }

  // Download alle hi-res foto's van een bestelling. Werkt voor single (photoUrl)
  // en multi-foto orders (photoUrls).
  async function downloadOrderPhotos(order: Order) {
    const urls = (order.photoUrls && order.photoUrls.length > 0)
      ? order.photoUrls
      : (order.photoUrl ? [order.photoUrl] : [])
    if (urls.length === 0) return

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      try {
        const res = await fetch(url)
        const blob = await res.blob()
        const objectUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objectUrl
        // Filename: order-{id}-{n}.jpg met fallback naar laatste url segment
        const segment = url.split('/').pop()?.split('?')[0] || `foto-${i + 1}.jpg`
        a.download = `bjay-${order.id}-${segment}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(objectUrl)
        // Korte pauze tussen downloads om browser-blocking te voorkomen
        if (i < urls.length - 1) await new Promise(r => setTimeout(r, 300))
      } catch (err) {
        console.error('Download mislukt voor', url, err)
      }
    }
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
        {/* Filter chips + handmatige bestelling */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
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
          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
            style={{ backgroundColor: '#053221', color: '#c8a96e', border: '1px solid #053221' }}
          >
            {showManualForm ? 'Annuleer' : '+ Handmatige bestelling'}
          </button>
        </div>

        {showManualForm && (
          <form
            onSubmit={submitManualOrder}
            className="rounded-lg p-4 flex flex-col gap-3"
            style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
          >
            <p className="text-xs" style={{ color: '#4a6358' }}>
              Voor bestellingen die buiten de app om binnenkwamen (bv. via WhatsApp/mail). Geen bevestigingsmail wordt verstuurd.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Klant-code (bv. gltbopen2026)"
                value={manualClientCode}
                onChange={e => setManualClientCode(e.target.value)}
                className="px-3 py-2 text-sm focus:outline-none"
                style={{ backgroundColor: '#fff', color: '#053221', border: '1px solid rgba(200,169,110,0.4)' }}
              />
              <input
                type="text"
                placeholder="Naam klant"
                value={manualCustomerName}
                onChange={e => setManualCustomerName(e.target.value)}
                className="px-3 py-2 text-sm focus:outline-none"
                style={{ backgroundColor: '#fff', color: '#053221', border: '1px solid rgba(200,169,110,0.4)' }}
              />
              <input
                type="email"
                placeholder="E-mail klant (optioneel)"
                value={manualCustomerEmail}
                onChange={e => setManualCustomerEmail(e.target.value)}
                className="px-3 py-2 text-sm focus:outline-none"
                style={{ backgroundColor: '#fff', color: '#053221', border: '1px solid rgba(200,169,110,0.4)' }}
              />
              <input
                type="text"
                required
                placeholder="Omschrijving (bv. 3 foto's hoge resolutie)"
                value={manualDescription}
                onChange={e => setManualDescription(e.target.value)}
                className="px-3 py-2 text-sm focus:outline-none"
                style={{ backgroundColor: '#fff', color: '#053221', border: '1px solid rgba(200,169,110,0.4)' }}
              />
              <input
                type="text"
                required
                placeholder="Prijs (bv. 15 of 15,50)"
                value={manualPrice}
                onChange={e => setManualPrice(e.target.value)}
                className="px-3 py-2 text-sm focus:outline-none"
                style={{ backgroundColor: '#fff', color: '#053221', border: '1px solid rgba(200,169,110,0.4)' }}
              />
              <select
                value={manualStatus}
                onChange={e => setManualStatus(e.target.value as OrderStatus)}
                className="px-3 py-2 text-sm focus:outline-none"
                style={{ backgroundColor: '#fff', color: '#053221', border: '1px solid rgba(200,169,110,0.4)' }}
              >
                {STATUS_ORDER.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Notitie (optioneel)"
              value={manualNotes}
              onChange={e => setManualNotes(e.target.value)}
              rows={2}
              className="px-3 py-2 text-sm focus:outline-none"
              style={{ backgroundColor: '#fff', color: '#053221', border: '1px solid rgba(200,169,110,0.4)' }}
            />
            {manualError && <p className="text-xs" style={{ color: '#a05a5a' }}>{manualError}</p>}
            <button
              type="submit"
              disabled={manualSubmitting}
              className="self-start px-4 py-2 text-xs font-medium tracking-widest uppercase transition hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: '#053221', color: '#c8a96e' }}
            >
              {manualSubmitting ? 'Bezig...' : 'Toevoegen'}
            </button>
          </form>
        )}

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
            {filtered.map(order => {
              const isEventOrder = Boolean(order.packageType)
              const isUnlimited = order.packageType === 'unlimited'
              const photoUrls = order.photoUrls || []
              const photoCount = isUnlimited ? 'alle' : photoUrls.length || 1
              return (
                <div
                  key={order.id}
                  className="rounded-lg p-4 flex flex-col sm:flex-row gap-4"
                  style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
                >
                  {/* Thumbnail(s) */}
                  <div className="flex-shrink-0">
                    {isEventOrder ? (
                      isUnlimited ? (
                        <div
                          className="w-24 h-24 rounded flex items-center justify-center text-center text-xs"
                          style={{
                            backgroundColor: 'rgba(200,169,110,0.15)',
                            color: '#c8a96e',
                            border: '1px dashed rgba(200,169,110,0.5)',
                          }}
                        >
                          Alle foto&apos;s
                        </div>
                      ) : photoUrls.length === 1 ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={photoUrls[0]}
                          alt=""
                          className="w-24 h-24 object-cover rounded"
                        />
                      ) : (
                        <div className="grid grid-cols-2 gap-1 w-24">
                          {photoUrls.slice(0, 4).map((url, i) => (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              key={i}
                              src={url}
                              alt=""
                              className="w-full aspect-square object-cover rounded-sm"
                            />
                          ))}
                        </div>
                      )
                    ) : order.photoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={order.photoUrl}
                        alt=""
                        className="w-24 h-24 object-cover rounded"
                      />
                    ) : (
                      <div
                        className="w-24 h-24 rounded flex items-center justify-center text-center text-xs"
                        style={{
                          backgroundColor: 'rgba(200,169,110,0.15)',
                          color: '#c8a96e',
                          border: '1px dashed rgba(200,169,110,0.5)',
                        }}
                      >
                        Handmatig
                      </div>
                    )}
                  </div>

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
                      {isEventOrder && (
                        <span
                          className="text-[10px] px-2 py-0.5 tracking-widest uppercase rounded-full"
                          style={{
                            backgroundColor: 'rgba(200,169,110,0.15)',
                            color: '#c8a96e',
                            border: '1px solid rgba(200,169,110,0.4)',
                          }}
                        >
                          Digitaal
                        </span>
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
                      {isEventOrder ? 'Pakket' : 'Formaat'}:{' '}
                      <span style={{ color: '#053221' }}>{order.format}</span>
                      {isEventOrder && (
                        <> ({photoCount} foto{photoCount !== 1 ? "'s" : ''})</>
                      )}
                      {' · '}
                      Prijs: <span style={{ color: '#053221' }}>{order.price}</span>
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(74,99,88,0.7)' }}>
                      {new Date(order.createdAt).toLocaleString('nl-NL')}
                      {order.updatedAt !== order.createdAt && (
                        <> · gewijzigd {new Date(order.updatedAt).toLocaleString('nl-NL')}</>
                      )}
                    </p>
                    {order.reviewRequestedAt && (
                      <p className="text-xs" style={{ color: '#2d8a3e' }}>
                        Review-verzoek verstuurd op {new Date(order.reviewRequestedAt).toLocaleDateString('nl-NL')}
                      </p>
                    )}
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadOrderPhotos(order)}
                        className="text-xs px-2 py-1 transition hover:opacity-80"
                        style={{
                          backgroundColor: '#053221',
                          color: '#c8a96e',
                          border: '1px solid #053221',
                        }}
                        title="Download hi-res foto's om naar de klant te mailen"
                      >
                        Download hi-res
                      </button>
                      {(order.status === 'paid' || order.status === 'shipped') && order.customerEmail && (
                        <button
                          onClick={() => sendReview(order.id)}
                          disabled={updating[order.id]}
                          className="text-xs px-2 py-1 transition hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: '#fff',
                            color: '#053221',
                            border: '1px solid rgba(200,169,110,0.6)',
                          }}
                          title="Stuur de klant een Google-review verzoek"
                        >
                          {order.reviewRequestedAt ? 'Review opnieuw' : 'Stuur review-verzoek'}
                        </button>
                      )}
                      <button
                        onClick={() => deleteOrder(order)}
                        disabled={deletingId === order.id}
                        title="Bestelling verwijderen"
                        aria-label="Bestelling verwijderen"
                        className="flex items-center justify-center w-7 h-7 rounded transition hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ color: '#b54545' }}
                      >
                        {deletingId === order.id ? (
                          <span className="text-xs">...</span>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                            <path d="M10 11v6"></path>
                            <path d="M14 11v6"></path>
                            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
