'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PhotoGrid from '@/components/PhotoGrid'
import PhotoModal from '@/components/PhotoModal'
import { Photo } from '@/lib/types'

export default function GalleryPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const router = useRouter()

  const [photos, setPhotos] = useState<Photo[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [photosRes, favsRes] = await Promise.all([
        fetch(`/api/clients/${clientId}/photos`),
        fetch(`/api/clients/${clientId}/favorites`),
      ])

      if (photosRes.status === 401) {
        router.push('/login')
        return
      }

      const photosData = await photosRes.json()
      const favsData = await favsRes.json()

      setPhotos(photosData.photos || [])
      setFavorites(favsData.favorites || [])
      setLoading(false)
    }

    load()
  }, [clientId, router])

  async function toggleFavorite(photoId: string) {
    const isFav = favorites.includes(photoId)
    setFavorites(prev =>
      isFav ? prev.filter(id => id !== photoId) : [...prev, photoId]
    )

    await fetch(`/api/clients/${clientId}/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoId }),
    })
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'client' }),
    })
    router.push('/login')
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#e8ede9' }}>
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#053221' }}>
        <h1 className="text-2xl font-light tracking-widest uppercase" style={{ color: '#c8a96e' }}>
          Bjay.photo
        </h1>
        <button
          onClick={handleLogout}
          className="text-sm transition hover:opacity-70"
          style={{ color: '#e8ede9' }}
        >
          Uitloggen
        </button>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p style={{ color: '#4a6358' }}>Foto's laden...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p style={{ color: '#4a6358' }}>Er zijn nog geen foto's beschikbaar.</p>
          </div>
        ) : (
          <>
            <p className="text-sm mb-6" style={{ color: '#4a6358' }}>
              {photos.length} foto{photos.length !== 1 ? "'s" : ''} beschikbaar
            </p>
            <PhotoGrid
              photos={photos}
              favorites={favorites}
              onSelect={setSelectedPhoto}
              onToggleFavorite={toggleFavorite}
            />
          </>
        )}
      </div>

      {/* Modal */}
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          photos={photos}
          isFavorite={favorites.includes(selectedPhoto.publicId)}
          onClose={() => setSelectedPhoto(null)}
          onToggleFavorite={toggleFavorite}
          clientId={clientId}
        />
      )}
    </main>
  )
}