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
  const feedbackSent = sentPhotos.includes(current.publicId)

  const idx = photos.findIndex(p => p.publicId === current.publicId)
  const hasPrev = idx > 0
  const hasNext = idx < photos.length - 1

  function prev() { if (hasPrev) { setCurrent(photos[idx - 1]) } }
  function next() { if (hasNext) { setCurrent(photos[idx + 1]) } }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx])

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

  const currentIsFav = isFavorite && photo.publicId === current.publicId

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(5, 50, 33, 0.95)' }}
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full rounded-lg overflow-hidden shadow-2xl"
        style={{ backgroundColor: '#032a1c' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sluitknop */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-2xl z-10 hover:opacity-70 transition"
          style={{ color: '#c8a96e' }}
        >
          ✕
        </button>

        {/* Foto teller */}
        <div className="absolute top-3 left-4 text-sm z-10" style={{ color: '#c8a96e' }}>
          {idx + 1} / {photos.length}
        </div>

        {/* Foto + navigatie */}
        <div className="relative flex items-center">
          <button
            onClick={prev}
            disabled={!hasPrev}
            className="absolute left-2 z-10 text-3xl px-2 py-1 rounded transition hover:opacity-80 disabled:opacity-20"
            style={{ color: '#c8a96e' }}
          >
            ‹
          </button>

          <Image
            src={current.url}
            alt=""
            width={current.width}
            height={current.height}
            className="w-full h-auto max-h-[70vh] object-contain"
            priority
          />

          <button
            onClick={next}
            disabled={!hasNext}
            className="absolute right-2 z-10 text-3xl px-2 py-1 rounded transition hover:opacity-80 disabled:opacity-20"
            style={{ color: '#c8a96e' }}
          >
            ›
          </button>
        </div>

        {/* Acties */}
        <div className="p-4 flex flex-col gap-4">
          <div className="flex gap-3">
            <button
              onClick={() => onToggleFavorite(current.publicId)}
              className="flex-1 py-2 rounded font-medium transition hover:opacity-80"
              style={{
                backgroundColor: currentIsFav ? '#c8a96e' : 'transparent',
                color: currentIsFav ? '#053221' : '#c8a96e',
                border: '1px solid #c8a96e',
              }}
            >
              {currentIsFav ? '❤️ Favoriet' : '🤍 Favoriet markeren'}
            </button>

            <button
              onClick={handleDownload}
              className="flex-1 py-2 rounded font-medium transition hover:opacity-80"
              style={{ backgroundColor: '#c8a96e', color: '#053221' }}
            >
              ↓ Downloaden
            </button>
          </div>

          {/* Feedback */}
          {feedbackSent ? (
            <p className="text-sm text-center" style={{ color: '#c8a96e' }}>
              Reactie verstuurd, bedankt!
            </p>
          ) : (
            <form onSubmit={handleFeedback} className="flex gap-2">
              <input
                type="text"
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Laat een reactie achter over deze foto..."
                className="flex-1 rounded px-3 py-2 text-sm focus:outline-none"
                style={{
                  backgroundColor: '#053221',
                  color: '#e8ede9',
                  border: '1px solid #4a6358',
                }}
              />
              <button
                type="submit"
                disabled={sending || !feedback}
                className="px-4 py-2 rounded text-sm font-medium transition disabled:opacity-40"
                style={{ backgroundColor: '#4a6358', color: '#e8ede9' }}
              >
                {sending ? '...' : 'Stuur'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}