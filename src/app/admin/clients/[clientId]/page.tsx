'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Client, Photo, Feedback } from '@/lib/types'

export default function AdminClientPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const router = useRouter()

  const [client, setClient] = useState<Client | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    async function load() {
      const [clientRes, photosRes, favsRes, feedbackRes, coverRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch(`/api/clients/${clientId}/photos`),
        fetch(`/api/clients/${clientId}/favorites`),
        fetch(`/api/clients/${clientId}/feedback`),
        fetch(`/api/clients/${clientId}/cover`),
      ])
      try {
        const clientData = await clientRes.json()
        const photosData = await photosRes.json()
        const favsData = await favsRes.json()
        const feedbackData = await feedbackRes.json()
        const coverData = await coverRes.json()
        setClient(clientData.client)
        setPhotos(photosData.photos || [])
        setFavorites(favsData.favorites || [])
        setFeedback(feedbackData.feedback || [])
        setCoverUrl(coverData.cover || null)
      } catch (err) {
        console.error('Laad fout:', err)
      }
      setLoading(false)
    }
    load()
  }, [clientId])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadError('')
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('clientId', clientId)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) setUploadError('Er ging iets mis bij het uploaden.')
    }
    const photosRes = await fetch(`/api/clients/${clientId}/photos`)
    const photosData = await photosRes.json()
    setPhotos(photosData.photos || [])
    setUploading(false)
  }

  async function setCover(photo: Photo) {
    setCoverUrl(photo.url)
    await fetch(`/api/clients/${clientId}/cover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrl: photo.url }),
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e8ede9' }}>
        <p className="text-sm" style={{ color: '#4a6358' }}>Laden...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#e8ede9' }}>

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between"
        style={{ backgroundColor: '#053221', borderBottom: '1px solid rgba(200,169,110,0.2)' }}>
        <div className="flex items-center gap-3">
          <Image src="/logoBJAYv3.0-iconbackground.png" alt="Bjay.photo" width={32} height={32} />
          <span className="text-base font-bold tracking-widest uppercase"
            style={{ color: '#c8a96e', fontFamily: 'var(--font-jost), sans-serif' }}>
            Bjay.photo
          </span>
          <span className="text-xs tracking-widest uppercase ml-1"
            style={{ color: 'rgba(232,237,233,0.3)' }}>
            / {client?.name}
          </span>
        </div>
        <button
          onClick={() => router.push('/admin/dashboard')}
          className="text-sm transition hover:opacity-70"
          style={{ color: 'rgba(232,237,233,0.5)' }}
        >
          ← Dashboard
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col gap-10">

        {/* Klantinfo + stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-1 p-5 flex flex-col gap-2"
            style={{ border: '1px solid rgba(200,169,110,0.15)' }}>
            <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'rgba(200,169,110,0.6)' }}>
              Klantinfo
            </p>
            <p className="text-xs" style={{ color: 'rgba(232,237,233,0.5)' }}>
              {client?.email || 'Geen e-mail'}
            </p>
            <p className="text-sm font-mono tracking-widest mt-1" style={{ color: '#c8a96e' }}>
              {client?.code}
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(232,237,233,0.3)' }}>
              {client ? new Date(client.createdAt).toLocaleDateString('nl-NL') : ''}
            </p>
          </div>
          {[
            { label: "Foto's", value: photos.length },
            { label: 'Favorieten', value: favorites.length },
            { label: 'Reacties', value: feedback.length },
          ].map(stat => (
            <div key={stat.label} className="p-5 flex flex-col justify-center items-center"
              style={{ border: '1px solid rgba(200,169,110,0.15)' }}>
              <p className="text-4xl font-light" style={{ color: '#c8a96e' }}>{stat.value}</p>
              <p className="text-xs tracking-widest uppercase mt-1"
                style={{ color: 'rgba(232,237,233,0.4)' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Upload */}
        <div>
          <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'rgba(200,169,110,0.6)' }}>
            Foto's uploaden
          </p>
          <label
            className="flex items-center justify-center p-10 cursor-pointer transition"
            style={{ border: '1px dashed rgba(200,169,110,0.3)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(200,169,110,0.6)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(200,169,110,0.3)')}
          >
            <div className="text-center">
              <p className="text-sm" style={{ color: uploading ? '#c8a96e' : 'rgba(232,237,233,0.5)' }}>
                {uploading ? 'Uploaden...' : "Klik om foto's te selecteren"}
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(232,237,233,0.3)' }}>JPG, PNG, WEBP</p>
            </div>
            <input type="file" accept="image/*" multiple className="hidden"
              onChange={handleUpload} disabled={uploading} />
          </label>
          {uploadError && <p className="text-xs mt-2" style={{ color: '#c8a96e' }}>{uploadError}</p>}
        </div>

        {/* Foto grid */}
        {photos.length > 0 && (
          <div>
            <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'rgba(200,169,110,0.6)' }}>
              Foto's ({photos.length})
            </p>
            <p className="text-xs mb-4" style={{ color: 'rgba(232,237,233,0.3)' }}>
              Hover over een foto om deze als omslagfoto in te stellen.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
              {photos.map(photo => {
                const isCover = coverUrl === photo.url
                return (
                  <div key={photo.publicId} className="relative overflow-hidden aspect-square group">
                    <Image src={photo.thumbnail} alt="" fill className="object-cover" />

                    {isCover && (
                      <div className="absolute top-1 left-1 text-xs px-2 py-0.5"
                        style={{ backgroundColor: '#c8a96e', color: '#053221' }}>
                        Cover
                      </div>
                    )}
                    {favorites.includes(photo.publicId) && (
                      <div className="absolute top-1 right-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#c8a96e" stroke="#c8a96e" strokeWidth="1.5">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </div>
                    )}
                    {!isCover && (
                      <button
                        onClick={() => setCover(photo)}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 text-xs font-medium tracking-wide"
                        style={{ backgroundColor: 'rgba(5,50,33,0.8)', color: '#c8a96e' }}
                      >
                        Stel in als cover
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Feedback */}
        {feedback.length > 0 && (
          <div>
            <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'rgba(200,169,110,0.6)' }}>
              Reacties
            </p>
            <div className="flex flex-col gap-px">
              {feedback.map((fb, i) => {
                const relatedPhoto = photos.find(p => p.publicId === fb.photoId)
                return (
                  <div key={i} className="p-4 flex gap-4 items-start"
                    style={{ backgroundColor: '#0d1f18', border: '1px solid rgba(200,169,110,0.1)' }}>
                    {relatedPhoto ? (
                      <img src={relatedPhoto.thumbnail} alt=""
                        className="w-14 h-14 object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 flex-shrink-0"
                        style={{ backgroundColor: 'rgba(200,169,110,0.1)' }} />
                    )}
                    <div>
                      <p className="text-sm" style={{ color: '#e8ede9' }}>{fb.message}</p>
                      <p className="text-xs mt-1" style={{ color: 'rgba(232,237,233,0.3)' }}>
                        {new Date(fb.createdAt).toLocaleString('nl-NL')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}