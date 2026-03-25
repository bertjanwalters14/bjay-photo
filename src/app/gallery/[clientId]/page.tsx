'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import PhotoGrid from '@/components/PhotoGrid'
import PhotoModal from '@/components/PhotoModal'
import { Photo, Client } from '@/lib/types'

export default function GalleryPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const router = useRouter()

  const [photos, setPhotos] = useState<Photo[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [photosRes, favsRes, clientRes] = await Promise.all([
        fetch(`/api/clients/${clientId}/photos`),
        fetch(`/api/clients/${clientId}/favorites`),
        fetch(`/api/clients/${clientId}`),
      ])

      if (photosRes.status === 401) {
        router.push('/login')
        return
      }

      const photosData = await photosRes.json()
      const favsData = await favsRes.json()
      const clientData = await clientRes.json()

      setPhotos(photosData.photos || [])
      setFavorites(favsData.favorites || [])
      setClient(clientData.client || null)
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
      <header
        className="sticky top-0 z-40 px-6 py-3 flex items-center justify-between"
        style={{ backgroundColor: '#053221', borderBottom: '1px solid rgba(200,169,110,0.2)' }}
      >
        <div className="flex items-center gap-3">
          <Image
            src="/logoBJAYv3.0-iconbackground.png"
            alt="Bjay.photo"
            width={36}
            height={36}
          />
          <span
            className="text-lg font-bold tracking-widest uppercase hidden sm:inline"
            style={{ color: '#c8a96e', fontFamily: 'var(--font-jost), sans-serif' }}
          >
            Bjay.photo
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="text-sm transition hover:opacity-70"
          style={{ color: 'rgba(232,237,233,0.6)' }}
        >
          Uitloggen
        </button>
      </header>

      {/* Hero tekst */}
      {!loading && client && (
        <div
          className="px-6 py-10 text-center"
          style={{ backgroundColor: '#053221' }}
        >
          <p className="text-sm tracking-widest uppercase mb-1" style={{ color: 'rgba(200,169,110,0.6)' }}>
            Jouw galerij
          </p>
          <h1
            className="text-3xl font-bold tracking-wide uppercase"
            style={{ color: '#c8a96e', fontFamily: 'var(--font-jost), sans-serif' }}
          >
            {client.name}
          </h1>
          <p className="text-sm mt-2" style={{ color: 'rgba(232,237,233,0.45)' }}>
            {photos.length} foto{photos.length !== 1 ? "'s" : ''} beschikbaar
          </p>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p style={{ color: '#4a6358' }}>Foto's laden...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p style={{ color: '#4a6358' }}>Er zijn nog geen foto's beschikbaar.</p>
          </div>
        ) : (
          <PhotoGrid
            photos={photos}
            favorites={favorites}
            onSelect={setSelectedPhoto}
            onToggleFavorite={toggleFavorite}
          />
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