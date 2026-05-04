'use client'

import { useEffect, useMemo, useState } from 'react'
import { Photo } from '@/lib/types'
import { calculatePriceForCount, PRICE_CATALOG } from '@/lib/eventPackages'
import { apiUrl } from '@/lib/apiUrl'

interface Props {
  photos: Photo[]
  selectedIds: string[]
  clientId: string
  clientName?: string
  onRemove: (photoId: string) => void
  onClear: () => void
  onPlaced: () => void
}

export default function OrderCart({
  photos,
  selectedIds,
  clientId,
  clientName,
  onRemove,
  onClear,
  onPlaced,
}: Props) {
  const [showCheckout, setShowCheckout] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [placing, setPlacing] = useState(false)
  const [orderSent, setOrderSent] = useState(false)
  const [error, setError] = useState('')

  // Pre-fill naam vanuit visitor localStorage
  useEffect(() => {
    if (!showCheckout || customerName) return
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(`bjay:visitor:${clientId}`)
    if (stored) setCustomerName(stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCheckout, clientId])

  const selectedPhotos = useMemo(
    () => photos.filter(p => selectedIds.includes(p.publicId)),
    [photos, selectedIds]
  )

  const breakdown = useMemo(
    () => calculatePriceForCount(selectedIds.length),
    [selectedIds.length]
  )

  // Sluit checkout wanneer cart leeg wordt
  useEffect(() => {
    if (selectedIds.length === 0) setShowCheckout(false)
  }, [selectedIds.length])

  async function placeOrder() {
    setError('')
    if (selectedIds.length === 0) {
      setError('Selecteer minstens 1 foto')
      return
    }
    if (!customerName.trim()) {
      setError('Vul je naam in')
      return
    }
    if (!customerEmail.trim() || !/^\S+@\S+\.\S+$/.test(customerEmail)) {
      setError('Vul een geldig e-mailadres in')
      return
    }

    setPlacing(true)
    const res = await fetch(apiUrl('/api/orders'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientCode: clientId,
        clientName: clientName || clientId,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        packageType: 'custom',
        photoUrls: selectedPhotos.map(p => p.url),
      }),
    })
    setPlacing(false)
    if (res.ok) {
      setOrderSent(true)
      setTimeout(() => {
        setShowCheckout(false)
        setOrderSent(false)
        onClear()
        onPlaced()
      }, 2500)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data?.error || 'Bestelling kon niet verstuurd worden, probeer opnieuw.')
    }
  }

  if (selectedIds.length === 0 && !showCheckout) {
    return null
  }

  return (
    <>
      {/* Sticky bestelbalk */}
      {!showCheckout && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[60] px-4 py-3"
          style={{
            backgroundColor: 'rgba(5,50,33,0.96)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid rgba(200,169,110,0.3)',
          }}
        >
          <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-3">
            <div className="flex flex-col">
              <span className="text-sm" style={{ color: '#c8a96e' }}>
                {selectedIds.length === 0
                  ? "Selecteer foto's voor een digitale download"
                  : `${selectedIds.length} foto${selectedIds.length !== 1 ? "'s" : ''} - ${breakdown.priceLabel}`}
              </span>
              {breakdown.tip && (
                <span className="text-[11px]" style={{ color: 'rgba(200,169,110,0.7)' }}>
                  {breakdown.tip}
                </span>
              )}
            </div>
            {selectedIds.length > 0 && (
              <button
                onClick={onClear}
                className="text-xs underline"
                style={{ color: 'rgba(232,237,233,0.5)' }}
              >
                Wissen
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={() => setShowCheckout(true)}
              disabled={selectedIds.length === 0}
              className="px-4 py-2 text-xs font-medium tracking-widest uppercase transition disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#c8a96e', color: '#053221' }}
            >
              {selectedIds.length === 0
                ? "Selecteer foto's"
                : `Naar checkout - ${breakdown.priceLabel}`}
            </button>
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {showCheckout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto"
          style={{ backgroundColor: 'rgba(8,15,12,0.92)', backdropFilter: 'blur(6px)' }}
        >
          <div
            className="rounded-lg w-full max-w-lg p-6 my-auto"
            style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.4)' }}
          >
            {orderSent ? (
              <div className="text-center py-8">
                <p className="text-lg" style={{ color: '#c8a96e' }}>
                  Bestelling ontvangen!
                </p>
                <p className="text-sm mt-2" style={{ color: '#4a6358' }}>
                  Check je mail voor de bevestiging.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-lg font-light tracking-wide" style={{ color: '#053221' }}>
                    Bestelling
                  </h2>
                  <button
                    onClick={() => setShowCheckout(false)}
                    className="text-sm transition hover:opacity-70"
                    style={{ color: '#4a6358' }}
                  >
                    Sluit
                  </button>
                </div>

                {/* Samenvatting */}
                <div className="mb-5 rounded p-3" style={{ backgroundColor: 'rgba(200,169,110,0.08)' }}>
                  <p className="text-sm font-medium" style={{ color: '#053221' }}>
                    {selectedIds.length} foto{selectedIds.length !== 1 ? "'s" : ''} - {breakdown.priceLabel}
                  </p>
                  {breakdown.parts.length > 0 && (
                    <p className="text-xs mt-1" style={{ color: '#4a6358' }}>
                      {breakdown.parts.join(' + ')}
                    </p>
                  )}
                  {breakdown.tip && (
                    <p className="text-xs mt-2" style={{ color: '#c8a96e' }}>
                      {breakdown.tip}
                    </p>
                  )}
                </div>

                {/* Selectie thumbnails */}
                {selectedPhotos.length > 0 && (
                  <div className="mb-5">
                    <label
                      className="block text-xs tracking-widest uppercase mb-2"
                      style={{ color: '#4a6358' }}
                    >
                      Geselecteerde foto's ({selectedPhotos.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedPhotos.map(photo => (
                        <div key={photo.publicId} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.thumbnail}
                            alt=""
                            className="w-16 h-16 object-cover rounded"
                          />
                          <button
                            onClick={() => onRemove(photo.publicId)}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center"
                            style={{ backgroundColor: '#053221', color: '#c8a96e' }}
                            aria-label="Verwijder"
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tarieven info */}
                <details className="mb-5">
                  <summary className="text-xs cursor-pointer" style={{ color: '#4a6358' }}>
                    Hoe werkt de prijs?
                  </summary>
                  <ul className="text-xs mt-2 space-y-1" style={{ color: '#4a6358' }}>
                    {PRICE_CATALOG.map(p => (
                      <li key={p.label}>
                        {p.label}: <span style={{ color: '#053221' }}>{p.price}</span>
                      </li>
                    ))}
                    <li className="pt-1" style={{ color: 'rgba(74,99,88,0.7)' }}>
                      We rekenen automatisch de goedkoopste combinatie voor je selectie.
                    </li>
                  </ul>
                </details>

                {/* Klant info */}
                <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Jouw naam"
                    maxLength={80}
                    className="px-3 py-2 text-sm focus:outline-none"
                    style={{
                      backgroundColor: '#fff',
                      color: '#053221',
                      border: '1px solid rgba(200,169,110,0.4)',
                    }}
                  />
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    placeholder="Jouw e-mailadres"
                    maxLength={120}
                    className="px-3 py-2 text-sm focus:outline-none"
                    style={{
                      backgroundColor: '#fff',
                      color: '#053221',
                      border: '1px solid rgba(200,169,110,0.4)',
                    }}
                  />
                </div>

                {error && (
                  <p className="text-xs mb-3" style={{ color: '#a05a5a' }}>{error}</p>
                )}

                <button
                  onClick={placeOrder}
                  disabled={placing}
                  className="w-full py-3 text-xs font-medium tracking-widest uppercase transition disabled:opacity-40"
                  style={{ backgroundColor: '#053221', color: '#c8a96e' }}
                >
                  {placing ? 'Versturen...' : `Plaats bestelling - ${breakdown.priceLabel}`}
                </button>

                <p className="text-xs mt-4" style={{ color: 'rgba(74,99,88,0.7)' }}>
                  Je ontvangt direct een bevestigingsmail. Daarna stuur ik je een betaalverzoek; zodra dat is voldaan ontvang je de foto('s) zonder watermerk per mail.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
