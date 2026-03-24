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
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    async function load() {
      const [clientRes, photosRes, favsRes, feedbackRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch(`/api/clients/${clientId}/photos`),
        fetch(`/api/clients/${clientId}/favorites`),
        fetch(`/api/clients/${clientId}/feedback`),
      ])

      try {
        const clientData = await clientRes.json()
        const photosData = await photosRes.json()
        const favsData = await favsRes.json()
        const feedbackData = await feedbackRes.json()

        setClient(clientData.client)
        setPhotos(photosData.photos || [])
        setFavorites(favsData.favorites || [])
        setFeedback(feedbackData.feedback || [])
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

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        setUploadError('Er ging iets mis bij het uploaden.')
      }
    }

    const photosRes = await fetch(`/api/clients/${clientId}/photos`)
    const photosData = await photosRes.json()
    setPhotos(photosData.photos || [])
    setUploading(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e8ede9' }}>
        <p style={{ color: '#4a6358' }}>Laden...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#e8ede9' }}>
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#053221' }}>
        <h1 className="text-2xl font-light tracking-widest uppercase" style={{ color: '#c8a96e' }}>
          {client?.name}
        </h1>
        <button
          onClick={() => router.push('/admin/dashboard')}
          className="text-sm transition hover:opacity-70"
          style={{ color: '#e8ede9' }}
        >
          ← Dashboard
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">

        {/* Klantinfo */}
        <div className="rounded-lg p-4" style={{ backgroundColor: '#fff', border: '1px solid #c8a96e' }}>
          <p className="text-sm" style={{ color: '#4a6358' }}>E-mail: {client?.email || 'Niet opgegeven'}</p>
          <p className="text-sm mt-1" style={{ color: '#4a6358' }}>
            Inlogcode: <span className="font-mono tracking-widest" style={{ color: '#c8a96e' }}>{client?.code}</span>
          </p>
          <p className="text-sm mt-1" style={{ color: '#4a6358' }}>
            Aangemaakt: {client ? new Date(client.createdAt).toLocaleDateString('nl-NL') : ''}
          </p>
        </div>

        {/* Statistieken */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Foto's", value: photos.length },
            { label: 'Favorieten', value: favorites.length },
            { label: 'Reacties', value: feedback.length },
          ].map(stat => (
            <div key={stat.label} className="rounded-lg p-4 text-center" style={{ backgroundColor: '#fff', border: '1px solid #c8a96e' }}>
              <p className="text-3xl font-light" style={{ color: '#053221' }}>{stat.value}</p>
              <p className="text-sm mt-1" style={{ color: '#4a6358' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Upload */}
        <div>
          <h2 className="text-lg font-light mb-3" style={{ color: '#053221' }}>Foto's uploaden</h2>
          <label
            className="flex items-center justify-center rounded-lg p-8 cursor-pointer transition hover:opacity-80"
            style={{ backgroundColor: '#fff', border: '2px dashed #c8a96e' }}
          >
            <div className="text-center">
              <p style={{ color: '#053221' }}>{uploading ? 'Uploaden...' : "Klik om foto's te selecteren"}</p>
              <p className="text-sm mt-1" style={{ color: '#4a6358' }}>JPG, PNG, WEBP</p>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
          {uploadError && <p className="text-sm mt-2" style={{ color: '#c8a96e' }}>{uploadError}</p>}
        </div>

        {/* Foto grid */}
        {photos.length > 0 && (
          <div>
            <h2 className="text-lg font-light mb-3" style={{ color: '#053221' }}>
              Geüploade foto's ({photos.length})
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map(photo => (
                <div key={photo.publicId} className="relative rounded overflow-hidden aspect-square">
                  <Image
                    src={photo.thumbnail}
                    alt=""
                    fill
                    className="object-cover"
                  />
                  {favorites.includes(photo.publicId) && (
                    <span className="absolute top-1 right-1 text-sm">❤️</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback */}
        {feedback.length > 0 && (
          <div>
            <h2 className="text-lg font-light mb-3" style={{ color: '#053221' }}>Reacties</h2>
            <div className="flex flex-col gap-2">
              {feedback.map((fb, i) => {
                const relatedPhoto = photos.find(p => p.publicId === fb.photoId)
                return (
                  <div key={i} className="rounded-lg p-3 flex gap-3 items-start" style={{ backgroundColor: '#fff', border: '1px solid #c8a96e' }}>
                    {relatedPhoto ? (
                      <img
                        src={relatedPhoto.thumbnail}
                        alt=""
                        className="w-16 h-16 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded flex-shrink-0 flex items-center justify-center text-xs text-center p-1"
                        style={{ backgroundColor: '#e8ede9', color: '#4a6358' }}
                      >
                        {fb.photoId?.split('/').pop()}
                      </div>
                    )}
                    <div>
                      <p style={{ color: '#053221' }}>{fb.message}</p>
                      <p className="text-xs mt-1" style={{ color: '#4a6358' }}>
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