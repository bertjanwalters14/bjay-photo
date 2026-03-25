'use client'

import { useEffect, useState, useRef } from 'react'
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
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [gridVisible, setGridVisible] = useState(false)

  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const [photosRes, favsRes, clientRes, coverRes] = await Promise.all([
        fetch(`/api/clients/${clientId}/photos`),
        fetch(`/api/clients/${clientId}/favorites`),
        fetch(`/api/clients/${clientId}`),
        fetch(`/api/clients/${clientId}/cover`),
      ])

      if (photosRes.status === 401) {
        router.push('/login')
        return
      }

      const photosData = await photosRes.json()
      const favsData = await favsRes.json()
      const clientData = await clientRes.json()
      const coverData = await coverRes.json()

      setPhotos(photosData.photos || [])
      setFavorites(favsData.favorites || [])
      setClient(clientData.client || null)
      setCoverUrl(coverData.cover || null)
      setLoading(false)
    }

    load()
  }, [clientId, router])

  // Fade in grid wanneer het in beeld scrolt
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setGridVisible(true) },
      { threshold: 0.05 }
    )
    if (gridRef.current) observer.observe(gridRef.current)
    return () => observer.disconnect()
  }, [loading])

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

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#080f0c' }}>
        <p style={{ color: '#4a6358' }}>Foto's laden...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#e8ede9' }}>

      {/* Header */}
      <header
        className="fixed top-0 left-0 right-0 z-40 px-6 py-3 flex items-center justify-between"
        style={{ backgroundColor: 'rgba(5,50,33,0.85)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(200,169,110,0.2)' }}
      >
        <div className="flex items-center gap-3">
          <Image src="/logoBJAYv3.0-iconbackground.png" alt="Bjay.photo" width={32} height={32} />
          <span
            className="text-base font-bold tracking-widest uppercase hidden sm:inline"
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

      {/* Hero */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{ height: '100vh', backgroundColor: '#080f0c' }}
      >
        {coverUrl && (
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.85 }}
          />
        )}
        <div className="relative text-center px-6 z-10">
          <p className="text-sm tracking-widest uppercase mb-3" style={{ color: 'rgba(200,169,110,0.9)' }}>
            Jouw galerij
          </p>
          <h1
            className="text-5xl font-bold tracking-widest uppercase mb-10"
            style={{ color: '#fff', fontFamily: 'var(--font-jost), sans-serif', textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}
          >
            {client?.name}
          </h1>
          <button
            onClick={() => gridRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-3 text-sm font-medium tracking-widest uppercase transition mb-8"
            style={{ border: '1px solid rgba(255,255,255,0.8)', color: '#fff' }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#fff'
              ;(e.target as HTMLButtonElement).style.color = '#053221'
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'transparent'
              ;(e.target as HTMLButtonElement).style.color = '#fff'
            }}
          >
            Galerij weergeven
          </button>
          {/* Scroll indicator */}
          <div className="flex flex-col items-center gap-2 animate-bounce"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>

      {/* Grid sectie */}
      <div ref={gridRef}>
        {/* Subheader */}
        <div
          className="px-6 py-4 flex items-center justify-between sticky top-14 z-30"
          style={{ backgroundColor: '#053221', borderBottom: '1px solid rgba(200,169,110,0.2)' }}
        >
          <div>
            <p className="text-xs tracking-widest uppercase" style={{ color: 'rgba(200,169,110,0.6)' }}>
              {client?.name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(232,237,233,0.4)' }}>
              {photos.length} foto{photos.length !== 1 ? "'s" : ''}
            </p>
          </div>
        </div>

        {/* Foto grid met fade-in */}
        <div
          className="max-w-7xl mx-auto px-3 py-6 transition-all duration-700"
          style={{ opacity: gridVisible ? 1 : 0, transform: gridVisible ? 'translateY(0)' : 'translateY(24px)' }}
        >
          {photos.length === 0 ? (
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
          clientName={client?.name}
        />
      )}
    </main>
  )
}