'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Client, Photo, Feedback } from '@/lib/types'

type LikesByPhoto = Record<
  string,
  { count: number; names: { name: string; createdAt: string }[] }
>

export default function AdminClientPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const router = useRouter()

  const [client, setClient] = useState<Client | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [likes, setLikes] = useState<LikesByPhoto>({})
  const [likesTotal, setLikesTotal] = useState(0)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const isEvent = client?.type === 'event'

  // Aantal unieke namen over alle likes (case-insensitive op basis van trimmed lowercase)
  const uniqueLikers = useMemo(() => {
    const set = new Set<string>()
    for (const entry of Object.values(likes)) {
      for (const n of entry.names) set.add(n.name.trim().toLowerCase())
    }
    return set.size
  }, [likes])

  // Foto's gesorteerd op aantal likes (descending), gefilterd op >0 likes
  const photosByLikes = useMemo(() => {
    return photos
      .map(p => ({ photo: p, entry: likes[p.publicId] }))
      .filter(x => x.entry && x.entry.count > 0)
      .sort((a, b) => (b.entry?.count || 0) - (a.entry?.count || 0))
  }, [photos, likes])

  useEffect(() => {
    async function load() {
      const [clientRes, photosRes, favsRes, feedbackRes, coverRes, likesRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch(`/api/clients/${clientId}/photos`),
        fetch(`/api/clients/${clientId}/favorites`),
        fetch(`/api/clients/${clientId}/feedback`),
        fetch(`/api/clients/${clientId}/cover`),
        fetch(`/api/clients/${clientId}/likes`),
      ])
      try {
        const clientData = await clientRes.json()
        const photosData = await photosRes.json()
        const favsData = await favsRes.json()
        const feedbackData = await feedbackRes.json()
        const coverData = await coverRes.json()
        const likesData = likesRes.ok ? await likesRes.json() : { likes: {}, total: 0 }
        setClient(clientData.client)
        setPhotos(photosData.photos || [])
        setFavorites(favsData.favorites || [])
        setFeedback(feedbackData.feedback || [])
        setCoverUrl(coverData.cover || null)
        setLikes(likesData.likes || {})
        setLikesTotal(likesData.total || 0)
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

  async function handlePreview() {
    const res = await fetch(`/api/clients/${clientId}/preview-token`)
    const data = await res.json()
    window.open(`/gallery/${clientId}?preview=${data.token}`, '_blank')
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
        <p style={{ color: '#4a6358' }}>Laden...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#e8ede9' }}>

      {/* Header */}
      <header className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ backgroundColor: '#053221' }}>
        <div className="flex items-center gap-3 min-w-0">
          <Image src="/logoBJAYv3.0-iconbackground.png" alt="Bjay.photo" width={32} height={32} className="flex-shrink-0" />
          <h1 className="text-lg sm:text-xl font-bold tracking-widest uppercase flex-shrink-0"
            style={{ color: '#c8a96e', fontFamily: 'var(--font-jost), sans-serif' }}>
            Bjay.photo
          </h1>
          <span className="text-xs tracking-widest uppercase truncate" style={{ color: 'rgba(200,169,110,0.5)' }}>
            / {client?.name}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handlePreview}
            className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
            style={{ border: '1px solid rgba(200,169,110,0.6)', color: '#c8a96e' }}
          >
            Preview
          </button>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="text-sm transition hover:opacity-70"
            style={{ color: 'rgba(232,237,233,0.6)' }}
          >
            ← Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">

        {/* Klantinfo */}
        <div className="rounded-lg p-4" style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[10px] px-2 py-0.5 tracking-widest uppercase rounded-full"
              style={{
                backgroundColor: isEvent ? 'rgba(200,169,110,0.15)' : 'rgba(5,50,33,0.08)',
                color: isEvent ? '#c8a96e' : '#053221',
                border: isEvent ? '1px solid rgba(200,169,110,0.4)' : '1px solid rgba(5,50,33,0.2)',
              }}
            >
              {isEvent ? 'Event' : 'Personal'}
            </span>
          </div>
          {!isEvent && (
            <p className="text-sm" style={{ color: '#4a6358' }}>E-mail: {client?.email || 'Niet opgegeven'}</p>
          )}
          <p className="text-sm mt-1 break-all" style={{ color: '#4a6358' }}>
            Inlogcode: <span className="font-mono tracking-widest" style={{ color: '#c8a96e' }}>{client?.code}</span>
          </p>
          <p className="text-sm mt-1" style={{ color: '#4a6358' }}>
            Aangemaakt: {client ? new Date(client.createdAt).toLocaleDateString('nl-NL') : ''}
          </p>
        </div>

        {/* Statistieken (verschillen per type) */}
        <div className="grid grid-cols-3 gap-3">
          {(isEvent
            ? [
                { label: "Foto's", value: photos.length },
                { label: 'Likes totaal', value: likesTotal },
                { label: 'Unieke bezoekers', value: uniqueLikers },
              ]
            : [
                { label: "Foto's", value: photos.length },
                { label: 'Favorieten', value: favorites.length },
                { label: 'Reacties', value: feedback.length },
              ]
          ).map(stat => (
            <div key={stat.label} className="rounded-lg p-4 text-center"
              style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}>
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
            style={{ backgroundColor: '#fff', border: '2px dashed rgba(200,169,110,0.5)' }}
          >
            <div className="text-center">
              <p style={{ color: uploading ? '#c8a96e' : '#053221' }}>
                {uploading ? 'Uploaden...' : "Klik om foto's te selecteren"}
              </p>
              <p className="text-sm mt-1" style={{ color: '#4a6358' }}>JPG, PNG, WEBP</p>
            </div>
            <input type="file" accept="image/*" multiple className="hidden"
              onChange={handleUpload} disabled={uploading} />
          </label>
          {uploadError && <p className="text-sm mt-2" style={{ color: '#c8a96e' }}>{uploadError}</p>}
        </div>

        {/* Foto grid */}
        {photos.length > 0 && (
          <div>
            <h2 className="text-lg font-light mb-1" style={{ color: '#053221' }}>
              Foto's ({photos.length})
            </h2>
            <p className="text-sm mb-3" style={{ color: '#4a6358' }}>
              Hover over een foto om deze als omslagfoto in te stellen.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {photos.map(photo => {
                const isCover = coverUrl === photo.url
                const likeCount = likes[photo.publicId]?.count || 0
                return (
                  <div key={photo.publicId} className="relative overflow-hidden aspect-square group">
                    <Image src={photo.thumbnail} alt="" fill className="object-cover" />
                    {isCover && (
                      <div className="absolute top-1 left-1 text-xs px-2 py-0.5"
                        style={{ backgroundColor: '#c8a96e', color: '#053221' }}>
                        Cover
                      </div>
                    )}
                    {/* Personal: ster voor favoriet. Event: count badge. */}
                    {!isEvent && favorites.includes(photo.publicId) && (
                      <div className="absolute top-1 right-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#c8a96e" stroke="#c8a96e" strokeWidth="1.5">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </div>
                    )}
                    {isEvent && likeCount > 0 && (
                      <div
                        className="absolute top-1 right-1 flex items-center gap-1 px-1.5 py-0.5 text-xs"
                        style={{
                          backgroundColor: 'rgba(5,50,33,0.75)',
                          color: '#c8a96e',
                          borderRadius: '999px',
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="#c8a96e" stroke="#c8a96e" strokeWidth="1.5">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span className="font-medium">{likeCount}</span>
                      </div>
                    )}
                    {!isCover && (
                      <button
                        onClick={() => setCover(photo)}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 text-xs font-medium"
                        style={{ backgroundColor: 'rgba(5,50,33,0.75)', color: '#c8a96e' }}
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

        {/* Likes per foto (alleen events met likes) */}
        {isEvent && photosByLikes.length > 0 && (
          <div>
            <h2 className="text-lg font-light mb-3" style={{ color: '#053221' }}>
              Likes per foto
            </h2>
            <div className="flex flex-col gap-2">
              {photosByLikes.map(({ photo, entry }) => (
                <div
                  key={photo.publicId}
                  className="rounded-lg p-3 flex gap-3 items-start"
                  style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumbnail}
                    alt=""
                    className="w-16 h-16 object-cover rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs px-2 py-0.5 tracking-widest uppercase rounded-full"
                        style={{ backgroundColor: 'rgba(200,169,110,0.15)', color: '#c8a96e' }}
                      >
                        {entry?.count} like{entry && entry.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: '#053221' }}>
                      {(entry?.names || [])
                        .map(n => n.name)
                        .join(', ')}
                    </p>
                  </div>
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
                  <div key={i} className="rounded-lg p-3 flex gap-3 items-start"
                    style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}>
                    {relatedPhoto ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={relatedPhoto.thumbnail} alt=""
                        className="w-16 h-16 object-cover rounded flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded flex-shrink-0"
                        style={{ backgroundColor: '#e8ede9' }} />
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
