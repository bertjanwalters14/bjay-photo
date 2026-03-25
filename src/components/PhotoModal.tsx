'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Photo } from '@/lib/types'
import { PRINT_SIZES } from '@/lib/printSizes'

interface Props {
  photo: Photo
  photos: Photo[]
  isFavorite: boolean
  onClose: () => void
  onToggleFavorite: (photoId: string) => void
  clientId: string
  clientName?: string
}

export default function PhotoModal({ photo, photos, isFavorite, onClose, onToggleFavorite, clientId, clientName }: Props) {
  const [current, setCurrent] = useState(photo)
  const [feedback, setFeedback] = useState('')
  const [sentPhotos, setSentPhotos] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [favs, setFavs] = useState<string[]>(isFavorite ? [photo.publicId] : [])
  const [showOrder, setShowOrder] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState(PRINT_SIZES[0])
  const [ordering, setOrdering] = useState(false)
  const [orderSent, setOrderSent] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [copied, setCopied] = useState(false)
  const [previewRect, setPreviewRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const imgElRef = useRef<HTMLImageElement | null>(null)

  const feedbackSent = sentPhotos.includes(current.publicId)
  const idx = photos.findIndex(p => p.publicId === current.publicId)
  const hasPrev = idx > 0
  const hasNext = idx < photos.length - 1
  const currentIsFav = favs.includes(current.publicId)

  function prev() { if (hasPrev) { setCurrent(photos[idx - 1]); setShowOrder(false); setOrderSent(false) } }
  function next() { if (hasNext) { setCurrent(photos[idx + 1]); setShowOrder(false); setOrderSent(false) } }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape') { if (showOrder || showShare) { setShowOrder(false); setShowShare(false) } else onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, showOrder, showShare])

  const calcPreview = useCallback(() => {
    const img = imgElRef.current
    if (!img) return
    const rect = img.getBoundingClientRect()
    const dispW = rect.width
    const dispH = rect.height
    if (!dispW || !dispH) return

    const [wCm, hCm] = selectedFormat.format.replace(' cm', '').split('x').map(s => parseFloat(s.trim()))
    const fmtAspect = wCm / hCm
    const photoAspect = current.width / current.height

    let rW, rH
    if (fmtAspect > photoAspect) {
      rW = dispW * 0.88
      rH = rW / fmtAspect
    } else {
      rH = dispH * 0.88
      rW = rH * fmtAspect
    }

    setPreviewRect({
      left: (dispW - rW) / 2,
      top: (dispH - rH) / 2,
      width: rW,
      height: rH,
    })
  }, [selectedFormat, current])

  useEffect(() => {
    if (showOrder) {
      setTimeout(calcPreview, 150)
      window.addEventListener('resize', calcPreview)
    } else {
      setPreviewRect(null)
    }
    return () => window.removeEventListener('resize', calcPreview)
  }, [showOrder, calcPreview])

  useEffect(() => {
    if (showOrder) setTimeout(calcPreview, 50)
  }, [selectedFormat, calcPreview, showOrder])

  function handleToggleFav() {
    setFavs(prev => prev.includes(current.publicId)
      ? prev.filter(id => id !== current.publicId)
      : [...prev, current.publicId]
    )
    onToggleFavorite(current.publicId)
  }

  async function handleDownload() {
    const res = await fetch(current.url)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = current.publicId.split('/').pop() || 'foto.jpg'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFeedback(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    await fetch(`/api/clients/${clientId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoId: current.publicId, message: feedback }),
    })
    setSentPhotos(prev => [...prev, current.publicId])
    setSending(false)
    setFeedback('')
  }

  async function handleOrder() {
    setOrdering(true)
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoUrl: current.url,
        format: selectedFormat.format,
        price: selectedFormat.price,
        clientName: clientName || clientId,
        clientCode: clientId,
      }),
    })
    setOrdering(false)
    setOrderSent(true)
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(current.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#080f0c' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(200,169,110,0.15)' }}>
        <span className="text-sm tracking-widest" style={{ color: 'rgba(232,237,233,0.45)' }}>
          {idx + 1} / {photos.length}
        </span>
        <div className="flex items-center gap-4">
          <button onClick={handleToggleFav} className="flex items-center gap-2 text-sm transition hover:opacity-70"
            style={{ color: currentIsFav ? '#c8a96e' : 'rgba(232,237,233,0.6)' }}>
            <HeartIcon filled={currentIsFav} />
            <span className="hidden sm:inline">Favoriet</span>
          </button>
          <button onClick={() => { setShowShare(!showShare); setShowOrder(false) }}
            className="flex items-center gap-2 text-sm transition hover:opacity-70"
            style={{ color: showShare ? '#c8a96e' : 'rgba(232,237,233,0.6)' }}>
            <ShareIcon />
            <span className="hidden sm:inline">Delen</span>
          </button>
          <button onClick={() => { setShowOrder(!showOrder); setShowShare(false) }}
            className="flex items-center gap-2 text-sm transition hover:opacity-70"
            style={{ color: showOrder ? '#c8a96e' : 'rgba(232,237,233,0.6)' }}>
            <CartIcon />
            <span className="hidden sm:inline">Bestellen</span>
          </button>
          <button onClick={handleDownload} className="flex items-center gap-2 text-sm transition hover:opacity-70"
            style={{ color: 'rgba(232,237,233,0.6)' }}>
            <DownloadIcon />
            <span className="hidden sm:inline">Downloaden</span>
          </button>
          <button onClick={onClose} className="transition hover:opacity-70 ml-2"
            style={{ color: 'rgba(232,237,233,0.6)' }}>
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Deel panel */}
      {showShare && (
        <div className="flex-shrink-0 px-6 py-4 flex flex-wrap items-center gap-3"
          style={{ backgroundColor: '#0d1f18', borderBottom: '1px solid rgba(200,169,110,0.15)' }}>
          <span className="text-xs tracking-widest uppercase mr-2" style={{ color: 'rgba(200,169,110,0.7)' }}>Delen via</span>
          <a href={`https://wa.me/?text=${encodeURIComponent(current.url)}`} target="_blank" rel="noopener"
            className="px-4 py-1.5 text-xs rounded-sm transition hover:opacity-80"
            style={{ backgroundColor: '#25d366', color: '#fff' }}>WhatsApp</a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(current.url)}`} target="_blank" rel="noopener"
            className="px-4 py-1.5 text-xs rounded-sm transition hover:opacity-80"
            style={{ backgroundColor: '#1877f2', color: '#fff' }}>Facebook</a>
          <button onClick={handleCopyLink}
            className="px-4 py-1.5 text-xs rounded-sm transition hover:opacity-80"
            style={{ backgroundColor: 'rgba(200,169,110,0.2)', color: '#c8a96e', border: '1px solid rgba(200,169,110,0.3)' }}>
            {copied ? '✓ Gekopieerd' : 'Kopieer link'}
          </button>
        </div>
      )}

      {/* Bestel panel */}
      {showOrder && (
        <div className="flex-shrink-0 px-6 py-4"
          style={{ backgroundColor: '#0d1f18', borderBottom: '1px solid rgba(200,169,110,0.15)' }}>
          {orderSent ? (
            <p className="text-sm text-center py-2" style={{ color: '#c8a96e' }}>
              ✓ Bestelling ontvangen! Ik neem zo snel mogelijk contact met je op.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs tracking-widest uppercase" style={{ color: 'rgba(200,169,110,0.7)' }}>Formaat</span>
              {PRINT_SIZES.map(s => (
                <button key={s.format} onClick={() => setSelectedFormat(s)}
                  className="px-3 py-1.5 text-xs rounded-sm transition"
                  style={{
                    backgroundColor: selectedFormat.format === s.format ? '#c8a96e' : 'transparent',
                    color: selectedFormat.format === s.format ? '#053221' : 'rgba(232,237,233,0.6)',
                    border: '1px solid rgba(200,169,110,0.3)',
                  }}>
                  {s.format} — {s.price}
                </button>
              ))}
              <button onClick={handleOrder} disabled={ordering}
                className="px-5 py-1.5 text-xs font-medium rounded-sm transition disabled:opacity-40 ml-auto"
                style={{ backgroundColor: '#c8a96e', color: '#053221' }}>
                {ordering ? 'Versturen...' : `Bestellen — ${selectedFormat.price}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Foto gebied */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <button onClick={prev} disabled={!hasPrev}
          className="absolute left-4 z-10 transition hover:opacity-80 disabled:opacity-10"
          style={{ color: '#e8ede9' }}>
          <ChevronIcon dir="left" />
        </button>

        <div className="relative" style={{ maxHeight: 'calc(100vh - 200px)', maxWidth: '100%' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgElRef}
            src={current.url}
            alt=""
            onLoad={calcPreview}
            style={{ maxHeight: 'calc(100vh - 200px)', maxWidth: '100%', display: 'block', objectFit: 'contain' }}
          />

          {/* Formaat preview overlay */}
          {showOrder && !orderSent && previewRect && (
            <div className="absolute pointer-events-none" style={{
              left: previewRect.left,
              top: previewRect.top,
              width: previewRect.width,
              height: previewRect.height,
              border: '2px solid #c8a96e',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            }}>
              <span className="absolute bottom-2 left-0 right-0 text-center text-xs font-medium"
                style={{ color: '#c8a96e', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                {selectedFormat.format}
              </span>
            </div>
          )}
        </div>

        <button onClick={next} disabled={!hasNext}
          className="absolute right-4 z-10 transition hover:opacity-80 disabled:opacity-10"
          style={{ color: '#e8ede9' }}>
          <ChevronIcon dir="right" />
        </button>
      </div>

      {/* Feedback balk */}
      <div className="flex-shrink-0 px-6 py-3 flex items-center gap-3"
        style={{ borderTop: '1px solid rgba(200,169,110,0.15)' }}>
        {feedbackSent ? (
          <p className="text-sm w-full text-center" style={{ color: '#c8a96e' }}>
            Reactie verstuurd — bedankt!
          </p>
        ) : (
          <form onSubmit={handleFeedback} className="flex gap-2 w-full">
            <input type="text" value={feedback} onChange={e => setFeedback(e.target.value)}
              placeholder="Laat een reactie achter over deze foto..."
              className="flex-1 px-4 py-2 text-sm rounded-sm focus:outline-none"
              style={{ backgroundColor: '#0d1f18', color: '#e8ede9', border: '1px solid rgba(200,169,110,0.25)' }} />
            <button type="submit" disabled={sending || !feedback}
              className="px-5 py-2 text-sm font-medium rounded-sm transition disabled:opacity-30"
              style={{ backgroundColor: '#c8a96e', color: '#053221' }}>
              {sending ? '...' : 'Verstuur'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? '#c8a96e' : 'none'}
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}
function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}
function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}
function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'left' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
    </svg>
  )
}