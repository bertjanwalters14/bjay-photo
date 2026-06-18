'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Photo } from '@/lib/types'
import { PRINT_SIZES } from '@/lib/printSizes'
import { apiUrl } from '@/lib/apiUrl'

interface Props {
  photo: Photo
  photos: Photo[]
  isFavorite: boolean
  onClose: () => void
  onToggleFavorite: (photoId: string) => void
  clientId: string
  clientName?: string
  // Event mode: optionele like-counts per foto. Wanneer gezet rendert het hart
  // als 'Vind ik leuk - N' i.p.v. 'Favoriet'.
  likeCounts?: Record<string, number>
  // Cart-selectie voor digitale bestelling. Wanneer gezet toont 'Bestellen' een
  // toggle voor de cart i.p.v. (of naast) het print-paneel.
  selectedIds?: string[]
  onToggleSelection?: (photoId: string) => void
  // Toon ook de print-knop naast cart (typisch voor personal portals).
  showPrintOption?: boolean
}

export default function PhotoModal({
  photo,
  photos,
  isFavorite,
  onClose,
  onToggleFavorite,
  clientId,
  clientName,
  likeCounts,
  selectedIds,
  onToggleSelection,
  showPrintOption = false,
}: Props) {
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
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [orderError, setOrderError] = useState('')
  const imgElRef = useRef<HTMLImageElement | null>(null)

  // --- Zoom & pan: dubbelklik/dubbeltik om te zoomen, slepen om te schuiven,
  // knijpen (pinch) op mobiel. Refs naast state om stale-closures te vermijden.
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })
  const gestureRef = useRef<
    | { mode: 'drag' | 'pinch'; startX: number; startY: number; basePanX: number; basePanY: number; startDist: number; startScale: number }
    | null
  >(null)
  const lastTapRef = useRef(0)

  // Houdt de foto binnen z'n eigen vlak: max verschuiving = halve overgebleven breedte/hoogte.
  function clampPan(px: number, py: number, s: number) {
    const el = imgElRef.current
    if (!el || s <= 1) return { x: 0, y: 0 }
    const maxX = ((s - 1) * el.clientWidth) / 2
    const maxY = ((s - 1) * el.clientHeight) / 2
    return { x: Math.max(-maxX, Math.min(maxX, px)), y: Math.max(-maxY, Math.min(maxY, py)) }
  }
  function applyTransform(s: number, px: number, py: number) {
    const c = clampPan(px, py, s)
    scaleRef.current = s
    panRef.current = c
    setScale(s)
    setPan(c)
  }
  function resetZoom() {
    applyTransform(1, 0, 0)
  }
  function toggleZoom() {
    if (scaleRef.current > 1) resetZoom()
    else applyTransform(2.4, 0, 0)
  }
  function touchDist(a: React.Touch, b: React.Touch) {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
  }
  function onZoomMouseDown(e: React.MouseEvent) {
    if (scaleRef.current <= 1) return
    gestureRef.current = { mode: 'drag', startX: e.clientX, startY: e.clientY, basePanX: panRef.current.x, basePanY: panRef.current.y, startDist: 0, startScale: scaleRef.current }
  }
  function onZoomMouseMove(e: React.MouseEvent) {
    const g = gestureRef.current
    if (!g || g.mode !== 'drag') return
    applyTransform(scaleRef.current, g.basePanX + (e.clientX - g.startX), g.basePanY + (e.clientY - g.startY))
  }
  function endGesture() {
    gestureRef.current = null
  }
  function onZoomTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      gestureRef.current = { mode: 'pinch', startX: 0, startY: 0, basePanX: panRef.current.x, basePanY: panRef.current.y, startDist: touchDist(e.touches[0], e.touches[1]), startScale: scaleRef.current }
    } else if (e.touches.length === 1) {
      const now = Date.now()
      if (now - lastTapRef.current < 300) {
        toggleZoom()
        lastTapRef.current = 0
        return
      }
      lastTapRef.current = now
      if (scaleRef.current > 1) {
        const t = e.touches[0]
        gestureRef.current = { mode: 'drag', startX: t.clientX, startY: t.clientY, basePanX: panRef.current.x, basePanY: panRef.current.y, startDist: 0, startScale: scaleRef.current }
      }
    }
  }
  function onZoomTouchMove(e: React.TouchEvent) {
    const g = gestureRef.current
    if (!g) return
    if (g.mode === 'pinch' && e.touches.length === 2) {
      const d = touchDist(e.touches[0], e.touches[1])
      const s = Math.max(1, Math.min(4, g.startScale * (d / g.startDist)))
      applyTransform(s, panRef.current.x, panRef.current.y)
    } else if (g.mode === 'drag' && e.touches.length === 1 && scaleRef.current > 1) {
      const t = e.touches[0]
      applyTransform(scaleRef.current, g.basePanX + (t.clientX - g.startX), g.basePanY + (t.clientY - g.startY))
    }
  }
  function onZoomTouchEnd(e: React.TouchEvent) {
    if (gestureRef.current?.mode === 'pinch' && scaleRef.current <= 1.05) resetZoom()
    if (e.touches.length === 0) endGesture()
  }

  const cartMode = Boolean(onToggleSelection)
  const inCart = selectedIds?.includes(current.publicId) ?? false

  // Pre-fill customer naam vanuit localStorage 1x bij mount (alleen personal flow)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(`bjay:visitor:${clientId}`)
    if (stored && !customerName) setCustomerName(stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const feedbackSent = sentPhotos.includes(current.publicId)
  const idx = photos.findIndex(p => p.publicId === current.publicId)
  const hasPrev = idx > 0
  const hasNext = idx < photos.length - 1
  const currentIsFav = favs.includes(current.publicId)
  const currentLikeCount = likeCounts?.[current.publicId] ?? 0

  function prev() { if (hasPrev) { setCurrent(photos[idx - 1]); setShowOrder(false); setOrderSent(false); setOrderError(''); resetZoom() } }
  function next() { if (hasNext) { setCurrent(photos[idx + 1]); setShowOrder(false); setOrderSent(false); setOrderError(''); resetZoom() } }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape') { if (showOrder || showShare) { setShowOrder(false); setShowShare(false) } else onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, showOrder, showShare])

  const calcPreview = useCallback(() => {}, [])

  useEffect(() => {
    if (!showOrder) return
    window.addEventListener('resize', calcPreview)
    return () => window.removeEventListener('resize', calcPreview)
  }, [showOrder, calcPreview])

  useEffect(() => {}, [selectedFormat, calcPreview, showOrder])

  function handleToggleFav() {
    setFavs(prev => prev.includes(current.publicId)
      ? prev.filter(id => id !== current.publicId)
      : [...prev, current.publicId]
    )
    onToggleFavorite(current.publicId)
  }

  // Cart-knop: digitale toevoeging aan bestelling (toggle)
  function handleCartButtonClick() {
    if (cartMode) {
      onToggleSelection?.(current.publicId)
    }
  }

  // Print-knop: opent het print-bestelpaneel (alleen voor personal)
  function handlePrintButtonClick() {
    setShowOrder(!showOrder)
    setShowShare(false)
  }

  async function handleDownload() {
    // Personal krijgt de schone, volledige-resolutie download; event de
    // (gewatermerkte) preview-URL.
    const res = await fetch(current.downloadUrl || current.url)
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
    await fetch(apiUrl(`/api/clients/${clientId}/feedback`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoId: current.publicId, message: feedback }),
    })
    setSentPhotos(prev => [...prev, current.publicId])
    setSending(false)
    setFeedback('')
  }

  async function handleOrder() {
    setOrderError('')
    if (!customerName.trim()) {
      setOrderError('Vul je naam in')
      return
    }
    if (!customerEmail.trim() || !/^\S+@\S+\.\S+$/.test(customerEmail)) {
      setOrderError('Vul een geldig e-mailadres in')
      return
    }
    setOrdering(true)
    const res = await fetch(apiUrl('/api/orders'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoId: current.publicId,
        format: selectedFormat.format,
        price: selectedFormat.price,
        clientName: clientName || clientId,
        clientCode: clientId,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
      }),
    })
    setOrdering(false)
    if (res.ok) {
      setOrderSent(true)
    } else {
      setOrderError('Bestelling kon niet verstuurd worden, probeer opnieuw.')
    }
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
            <span className="hidden sm:inline">
              {likeCounts
                ? `Vind ik leuk${currentLikeCount > 0 ? ` - ${currentLikeCount}` : ''}`
                : 'Favoriet'}
            </span>
          </button>
          <button onClick={() => { setShowShare(!showShare); setShowOrder(false) }}
            className="flex items-center gap-2 text-sm transition hover:opacity-70"
            style={{ color: showShare ? '#c8a96e' : 'rgba(232,237,233,0.6)' }}>
            <ShareIcon />
            <span className="hidden sm:inline">Delen</span>
          </button>
          {cartMode && (
            <button onClick={handleCartButtonClick}
              className="flex items-center gap-2 text-sm transition hover:opacity-70"
              style={{ color: inCart ? '#c8a96e' : 'rgba(232,237,233,0.6)' }}
              title={inCart ? 'In bestelling' : (showPrintOption ? 'Digitaal bestellen' : 'Toevoegen aan bestelling')}>
              <CartIcon />
              <span className="hidden sm:inline">
                {inCart ? 'In bestelling' : (showPrintOption ? 'Digitaal' : 'Bestellen')}
              </span>
            </button>
          )}
          {showPrintOption && (
            <button onClick={handlePrintButtonClick}
              className="flex items-center gap-2 text-sm transition hover:opacity-70"
              style={{ color: showOrder ? '#c8a96e' : 'rgba(232,237,233,0.6)' }}
              title="Afdruk bestellen">
              <PrinterIcon />
              <span className="hidden sm:inline">Afdruk</span>
            </button>
          )}
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
            {copied ? 'Gekopieerd' : 'Kopieer link'}
          </button>
        </div>
      )}

      {/* Bestel panel - alleen voor personal (print) flow */}
      {showOrder && showPrintOption && (
        <div className="flex-shrink-0 px-6 py-4"
          style={{ backgroundColor: '#0d1f18', borderBottom: '1px solid rgba(200,169,110,0.15)' }}>
          {orderSent ? (
            <p className="text-sm text-center py-2" style={{ color: '#c8a96e' }}>
              Bestelling ontvangen! Ik neem zo snel mogelijk contact met je op.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Jouw naam"
                  maxLength={80}
                  className="px-3 py-2 text-sm rounded-sm focus:outline-none"
                  style={{ backgroundColor: '#0a1813', color: '#e8ede9', border: '1px solid rgba(200,169,110,0.25)' }}
                />
                <input
                  type="email"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  placeholder="Jouw e-mailadres"
                  maxLength={120}
                  className="px-3 py-2 text-sm rounded-sm focus:outline-none"
                  style={{ backgroundColor: '#0a1813', color: '#e8ede9', border: '1px solid rgba(200,169,110,0.25)' }}
                />
              </div>

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
                    {s.format} - {s.price}
                  </button>
                ))}
                <button onClick={handleOrder} disabled={ordering}
                  className="px-5 py-1.5 text-xs font-medium rounded-sm transition disabled:opacity-40 ml-auto"
                  style={{ backgroundColor: '#c8a96e', color: '#053221' }}>
                  {ordering ? 'Versturen...' : `Bestellen - ${selectedFormat.price}`}
                </button>
              </div>

              {orderError && (
                <p className="text-xs" style={{ color: '#ff8a8a' }}>{orderError}</p>
              )}
              <p className="text-xs" style={{ color: 'rgba(232,237,233,0.45)' }}>
                Je ontvangt direct een bevestigingsmail. Daarna stuur ik je een betaalverzoek; zodra dat is voldaan neem ik je afdruk in bestelling en stuur ik hem zo snel mogelijk op.
              </p>
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

        <div
          className="relative"
          style={{ maxHeight: 'calc(100vh - 200px)', maxWidth: '100%', touchAction: 'none' }}
          onDoubleClick={toggleZoom}
          onMouseDown={onZoomMouseDown}
          onMouseMove={onZoomMouseMove}
          onMouseUp={endGesture}
          onMouseLeave={endGesture}
          onTouchStart={onZoomTouchStart}
          onTouchMove={onZoomTouchMove}
          onTouchEnd={onZoomTouchEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgElRef}
            src={current.url}
            alt=""
            draggable={false}
            style={{
              maxHeight: 'calc(100vh - 200px)',
              maxWidth: '100%',
              display: 'block',
              objectFit: 'contain',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: gestureRef.current ? 'none' : 'transform 0.18s ease',
              cursor: scale > 1 ? 'grab' : 'zoom-in',
              willChange: 'transform',
            }}
          />
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
            Reactie verstuurd - bedankt!
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
function PrinterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
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
