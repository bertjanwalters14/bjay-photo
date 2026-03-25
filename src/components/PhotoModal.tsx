'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Photo } from '@/lib/types'

interface Props {
  photo: Photo
  photos: Photo[]
  isFavorite: boolean
  onClose: () => void
  onToggleFavorite: (photoId: string) => void
  clientId: string
}

export default function PhotoModal({ photo, photos, isFavorite, onClose, onToggleFavorite, clientId }: Props) {
  const [current, setCurrent] = useState(photo)
  const [feedback, setFeedback] = useState('')
  const [sentPhotos, setSentPhotos] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [favs, setFavs] = useState<string[]>(isFavorite ? [photo.publicId] : [])

  const feedbackSent = sentPhotos.includes(current.publicId)
  const idx = photos.findIndex(p => p.publicId === current.publicId)
  const hasPrev = idx > 0
  const hasNext = idx < photos.length - 1
  const currentIsFav = favs.includes(current.publicId)

  function prev() { if (hasPrev) setCurrent(photos[idx - 1]) }
  function next() { if (hasNext) setCurrent(photos[idx + 1]) }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx])

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

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: '#080f0c' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(200,169,110,0.15)' }}>
        <span className="text-sm tracking-widest" style={{ color: 'rgba(232,237,233,0.45)' }}>
          {idx + 1} / {photos.length}
        </span>
        <div className="flex items-center gap-4">
          {/* Favoriet */}
          <button onClick={handleToggleFav} className="flex items-center gap-2 text-sm transition hover:opacity-70"
            style={{ color: currentIsFav ? '#c8a96e' : 'rgba(232,237,233,0.6)' }}>
            <HeartIcon filled={currentIsFav} />
            <span className="hidden sm:inline">{currentIsFav ? 'Favoriet' : 'Favoriet markeren'}</span>
          </button>
          {/* Download */}
          <button onClick={handleDownload} className="flex items-center gap-2 text-sm transition hover:opacity-70"
            style={{ color: 'rgba(232,237,233,0.6)' }}>
            <DownloadIcon />
            <span className="hidden sm:inline">Downloaden</span>
          </button>
          {/* Sluiten */}
          <button onClick={onClose} className="transition hover:opacity-70 ml-2"
            style={{ color: 'rgba(232,237,233,0.6)' }}>
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Foto gebied */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Vorige */}
        <button
          onClick={prev}
          disabled={!hasPrev}
          className="absolute left-4 z-10 transition hover:opacity-80 disabled:opacity-10"
          style={{ color: '#e8ede9' }}
        >
          <ChevronIcon dir="left" />
        </button>

        <Image
          src={current.url}
          alt=""
          width={current.width}
          height={current.height}
          className="max-h-full max-w-full object-contain"
          style={{ maxHeight: 'calc(100vh - 130px)' }}
          priority
        />

        {/* Volgende */}
        <button
          onClick={next}
          disabled={!hasNext}
          className="absolute right-4 z-10 transition hover:opacity-80 disabled:opacity-10"
          style={{ color: '#e8ede9' }}
        >
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
            <input
              type="text"
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Laat een reactie achter over deze foto..."
              className="flex-1 px-4 py-2 text-sm rounded-sm focus:outline-none"
              style={{ backgroundColor: '#0d1f18', color: '#e8ede9', border: '1px solid rgba(200,169,110,0.25)' }}
            />
            <button
              type="submit"
              disabled={sending || !feedback}
              className="px-5 py-2 text-sm font-medium rounded-sm transition disabled:opacity-30"
              style={{ backgroundColor: '#c8a96e', color: '#053221' }}
            >
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'left'
        ? <polyline points="15 18 9 12 15 6" />
        : <polyline points="9 18 15 12 9 6" />}
    </svg>
  )
}