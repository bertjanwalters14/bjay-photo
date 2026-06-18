'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Client, Photo, Feedback, Event } from '@/lib/types'

type LikesByPhoto = Record<
  string,
  { count: number; names: { name: string; createdAt: string }[] }
>

// Toont "5 min geleden", "3 uur geleden", "2 dagen geleden", etc. — leesbaarder
// dan een absolute datum voor de portaal-bezoek-stat.
function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (isNaN(then)) return 'onbekend'
  const diffSec = Math.floor((Date.now() - then) / 1000)
  if (diffSec < 60) return 'zojuist'
  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min} min geleden`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} uur geleden`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days} ${days === 1 ? 'dag' : 'dagen'} geleden`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} ${weeks === 1 ? 'week' : 'weken'} geleden`
  return new Date(iso).toLocaleDateString('nl-NL')
}

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
  // Bijbehorend event (voor popup-toggle + aanvragen-knop in de header).
  const [linkedEvent, setLinkedEvent] = useState<Event | null>(null)
  const [eventRequestCount, setEventRequestCount] = useState(0)
  const [togglingPopup, setTogglingPopup] = useState(false)
  const [visitStats, setVisitStats] = useState<{ lastVisit: string | null; visitCount: number }>({
    lastVisit: null,
    visitCount: 0,
  })
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editDate, setEditDate] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [archiving, setArchiving] = useState(false)
  // Verhaal-export: selectie van foto's die als webp-zip voor een
  // verhaal-pagina op bjay.photo wordt gedownload. Volgorde van aanvinken
  // bepaalt de nummering in de bestandsnamen.
  const [exportMode, setExportMode] = useState(false)
  const [exportSelection, setExportSelection] = useState<string[]>([])
  const [exportSlug, setExportSlug] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportDone, setExportDone] = useState(0)
  const [exportError, setExportError] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadTotal, setUploadTotal] = useState(0)
  const [uploadDone, setUploadDone] = useState(0)
  const [uploadFailed, setUploadFailed] = useState(0)

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
        if (clientData.stats) {
          setVisitStats({
            lastVisit: clientData.stats.lastVisit || null,
            visitCount: clientData.stats.visitCount || 0,
          })
        }
      } catch (err) {
        console.error('Laad fout:', err)
      }

      // Bijbehorend event opzoeken: matcht op wachtwoord === code, of slug
      // zonder streepjes === code (bv. hyrox-2026-heerenveen ↔ hyrox2026heerenveen).
      try {
        const evRes = await fetch('/api/events', { cache: 'no-store' })
        if (evRes.ok) {
          const evData = await evRes.json()
          const match = (evData.events || []).find(
            (e: Event) => e.password === clientId || e.slug.replace(/-/g, '') === clientId,
          )
          if (match) {
            setLinkedEvent(match)
            const reqRes = await fetch('/api/events/requests', { cache: 'no-store' })
            if (reqRes.ok) {
              const reqData = await reqRes.json()
              setEventRequestCount(
                (reqData.requests || []).filter(
                  (r: { eventSlug: string }) => r.eventSlug === match.slug,
                ).length,
              )
            }
          }
        }
      } catch {
        // mag stil falen
      }

      setLoading(false)
    }
    load()
  }, [clientId])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList)

    setUploading(true)
    setUploadError('')
    setUploadTotal(files.length)
    setUploadDone(0)
    setUploadFailed(0)

    // Stap 1: vraag signed upload-signature aan bij backend (auth check)
    const sigRes = await fetch('/api/upload/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    })
    if (!sigRes.ok) {
      setUploadError('Kon upload-toestemming niet ophalen. Log opnieuw in als admin.')
      setUploading(false)
      return
    }
    const { signature, timestamp, folder, apiKey, cloudName } = await sigRes.json()

    // Upload een enkele file met 1x retry bij failure
    async function uploadOne(file: File): Promise<boolean> {
      for (let attempt = 0; attempt < 2; attempt++) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('api_key', apiKey)
        formData.append('timestamp', String(timestamp))
        formData.append('signature', signature)
        formData.append('folder', folder)
        formData.append('use_filename', 'true')
        formData.append('unique_filename', 'true')
        // EXIF behouden zodat de datum/tijdslot-filter in de gallery werkt
        formData.append('image_metadata', 'true')

        try {
          const res = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: 'POST', body: formData }
          )
          if (res.ok) return true
        } catch {
          // ignore — retry
        }
        // wacht 500ms voor 2e poging
        if (attempt === 0) await new Promise(r => setTimeout(r, 500))
      }
      return false
    }

    // Concurrency-limited parallel uploads: 4 tegelijk
    const CONCURRENCY = 4
    let nextIndex = 0
    let doneCount = 0
    let failedCount = 0

    async function worker() {
      while (true) {
        const i = nextIndex++
        if (i >= files.length) return
        const ok = await uploadOne(files[i])
        if (ok) {
          doneCount += 1
          setUploadDone(doneCount)
        } else {
          failedCount += 1
          setUploadFailed(failedCount)
        }
      }
    }

    const workers = Array.from({ length: Math.min(CONCURRENCY, files.length) }, () => worker())
    await Promise.all(workers)

    if (failedCount > 0) {
      setUploadError(
        `${failedCount} van ${files.length} foto${failedCount !== 1 ? "'s konden" : ' kon'} niet worden geupload.`
      )
    }

    // Refresh foto-lijst
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

  // Popup van het gekoppelde event direct aan/uit zetten.
  async function togglePopup() {
    if (!linkedEvent) return
    const next = !linkedEvent.popupActive
    setTogglingPopup(true)
    const res = await fetch(`/api/events/${linkedEvent.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ popupActive: next }),
    })
    if (res.ok) {
      setLinkedEvent({ ...linkedEvent, popupActive: next })
    }
    setTogglingPopup(false)
  }

  // Handmatig archiveren: verwijdert alle Cloudinary-foto's en zet
  // archivedAt. Voor wanneer je niet wilt wachten op de dagelijkse cron.
  async function handleArchive() {
    if (!client) return
    const confirmed = window.confirm(
      `Foto's van "${client.name}" nu permanent verwijderen?\n\n` +
        `Dit verwijdert ALLE foto's uit Cloudinary. Likes, feedback en` +
        `\nbestellingen blijven bewaard.\n\nDit kan niet ongedaan worden gemaakt.`,
    )
    if (!confirmed) return

    setArchiving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/archive`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert(d?.error || 'Archiveren mislukt')
        return
      }
      const data = await res.json()
      if (data.client) {
        setClient(data.client)
        setPhotos([])
      }
    } catch (err) {
      console.error('Archive error:', err)
      alert('Archiveren mislukt - probeer opnieuw')
    } finally {
      setArchiving(false)
    }
  }

  // Inline-bewerken voor naam + e-mail. Gebruik je vooral als je een klant
  // hebt aangemaakt zonder e-mail en die later toevoegt.
  async function saveClientEdit(updates: { name?: string; email?: string; date?: string }) {
    const res = await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      const data = await res.json()
      setClient(data.client)
      return true
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data?.error || 'Bewerken mislukt')
      return false
    }
  }

  // Review-flow: markeer klant als opgeleverd (start de 3-daagse countdown)
  // of haal de markering weer weg.
  async function toggleDelivered() {
    if (!client) return
    const newValue = client.deliveredAt ? null : new Date().toISOString()
    const res = await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deliveredAt: newValue,
        // bij opnieuw markeren reset ook reviewRequestedAt zodat de mail
        // opnieuw kan worden verstuurd
        reviewRequestedAt: newValue ? client.reviewRequestedAt ?? null : null,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setClient(data.client)
    }
  }

  // Markeer dat er een review is binnengekomen op Google (handmatig vink)
  async function toggleReviewReceived() {
    if (!client) return
    const res = await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewReceived: !client.reviewReceived }),
    })
    if (res.ok) {
      const data = await res.json()
      setClient(data.client)
    }
  }

  async function setCover(photo: Photo) {
    setCoverUrl(photo.url)
    await fetch(`/api/clients/${clientId}/cover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrl: photo.url }),
    })
  }

  async function deletePhoto(photo: Photo) {
    if (!window.confirm(`Foto verwijderen?\n\n${photo.publicId.split('/').pop()}\n\nDit kan niet ongedaan worden gemaakt.`)) {
      return
    }
    const res = await fetch(`/api/clients/${clientId}/photos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId: photo.publicId }),
    })
    if (res.ok) {
      // Verwijder uit lokale state
      setPhotos(prev => prev.filter(p => p.publicId !== photo.publicId))
      // Als deze foto de cover was, leeg de coverUrl
      if (coverUrl === photo.url) setCoverUrl(null)
    } else {
      const data = await res.json().catch(() => ({}))
      window.alert(`Verwijderen mislukt: ${data?.error || 'Onbekende fout'}`)
    }
  }

  function toggleExportSelect(publicId: string) {
    setExportSelection(prev =>
      prev.includes(publicId) ? prev.filter(p => p !== publicId) : [...prev, publicId]
    )
  }

  // Snelkeuze: de 15 meest gelikete foto's (alleen zinvol bij events)
  function selectTopLiked() {
    const top = photosByLikes.slice(0, 15).map(x => x.photo.publicId)
    setExportSelection(top)
  }

  function selectAllPhotos() {
    setExportSelection(photos.map(p => p.publicId))
  }

  // Bouwt de zip in de browser: de foto's komen rechtstreeks van Cloudinary's
  // CDN (Vercel-responses zijn max 4,5 MB, dus server-side zippen kan niet).
  async function handleExport() {
    if (exportSelection.length === 0 || exporting) return
    const slug = exportSlug.trim().toLowerCase()

    setExporting(true)
    setExportError('')
    setExportDone(0)

    try {
      const res = await fetch(`/api/clients/${clientId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicIds: exportSelection, slug }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setExportError(d?.error || 'Export voorbereiden mislukt')
        return
      }
      const { files, snippet } = (await res.json()) as {
        files: { url: string; filename: string }[]
        snippet: string
      }

      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      zip.file('gallery-snippet.html', snippet)

      // Concurrency-limited downloads: 4 tegelijk, zelfde patroon als upload
      let nextIndex = 0
      let doneCount = 0
      let failed: string[] = []

      async function worker() {
        while (true) {
          const i = nextIndex++
          if (i >= files.length) return
          const f = files[i]
          try {
            const imgRes = await fetch(f.url)
            if (!imgRes.ok) throw new Error(`status ${imgRes.status}`)
            zip.file(f.filename, await imgRes.blob())
          } catch {
            failed = [...failed, f.filename]
          }
          doneCount += 1
          setExportDone(doneCount)
        }
      }
      await Promise.all(
        Array.from({ length: Math.min(4, files.length) }, () => worker())
      )

      if (failed.length > 0) {
        setExportError(`${failed.length} van ${files.length} foto's konden niet worden gedownload. Probeer opnieuw.`)
        return
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${slug}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
      setExportError('Export mislukt - probeer opnieuw')
    } finally {
      setExporting(false)
    }
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
          {isEvent && linkedEvent && (
            <>
              <button
                onClick={togglePopup}
                disabled={togglingPopup}
                className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80 disabled:opacity-40"
                style={
                  linkedEvent.popupActive
                    ? { backgroundColor: '#c8a96e', color: '#053221' }
                    : { border: '1px solid rgba(200,169,110,0.6)', color: '#c8a96e' }
                }
              >
                {togglingPopup ? 'Bezig...' : linkedEvent.popupActive ? 'Popup staat aan' : 'Popup aanzetten'}
              </button>
              <button
                onClick={() => router.push('/admin/event/requests')}
                className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
                style={{ border: '1px solid rgba(200,169,110,0.6)', color: '#c8a96e' }}
              >
                Aanvragen{eventRequestCount > 0 ? ` (${eventRequestCount})` : ''}
              </button>
            </>
          )}
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
          <div className="flex items-center justify-between gap-2 mb-2">
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
            {!editing && (
              <button
                onClick={() => {
                  setEditName(client?.name || '')
                  setEditEmail(client?.email || '')
                  setEditDate(client?.date || '')
                  setEditing(true)
                }}
                className="text-xs underline transition hover:opacity-70"
                style={{ color: '#c8a96e' }}
              >
                Bewerk
              </button>
            )}
          </div>
          {editing ? (
            <div className="flex flex-col gap-2 mb-2">
              <label className="text-xs" style={{ color: '#4a6358' }}>
                Naam
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 text-sm focus:outline-none"
                  style={{ border: '1px solid rgba(200,169,110,0.4)', color: '#053221' }}
                />
              </label>
              <label className="text-xs" style={{ color: '#4a6358' }}>
                {isEvent ? 'Datum event' : 'Datum shoot'}
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 text-sm focus:outline-none"
                  style={{ border: '1px solid rgba(200,169,110,0.4)', color: '#053221' }}
                />
              </label>
              {!isEvent && (
                <label className="text-xs" style={{ color: '#4a6358' }}>
                  E-mail
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    placeholder="naam@voorbeeld.nl"
                    className="w-full mt-1 px-2 py-1.5 text-sm focus:outline-none"
                    style={{ border: '1px solid rgba(200,169,110,0.4)', color: '#053221' }}
                  />
                </label>
              )}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={async () => {
                    setSavingEdit(true)
                    const ok = await saveClientEdit({
                      name: editName,
                      email: isEvent ? undefined : editEmail,
                      date: editDate,
                    })
                    setSavingEdit(false)
                    if (ok) setEditing(false)
                  }}
                  disabled={savingEdit || !editName.trim()}
                  className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: '#053221', color: '#c8a96e' }}
                >
                  {savingEdit ? 'Bezig...' : 'Opslaan'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  disabled={savingEdit}
                  className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
                  style={{ border: '1px solid rgba(74,99,88,0.4)', color: '#4a6358' }}
                >
                  Annuleer
                </button>
              </div>
            </div>
          ) : (
            !isEvent && (
              <p className="text-sm" style={{ color: '#4a6358' }}>
                E-mail: {client?.email || <span style={{ color: '#a05a5a' }}>Niet opgegeven</span>}
              </p>
            )
          )}
          <p className="text-sm mt-1 break-all" style={{ color: '#4a6358' }}>
            Inlogcode: <span className="font-mono tracking-widest" style={{ color: '#c8a96e' }}>{client?.code}</span>
          </p>
          <p className="text-sm mt-1" style={{ color: '#4a6358' }}>
            Aangemaakt: {client ? new Date(client.createdAt).toLocaleDateString('nl-NL') : ''}
          </p>
          {client?.date && (
            <p className="text-sm mt-1" style={{ color: '#4a6358' }}>
              {isEvent ? 'Datum event' : 'Datum shoot'}:{' '}
              <span style={{ color: '#053221' }}>
                {new Date(client.date).toLocaleDateString('nl-NL')}
              </span>
            </p>
          )}
          {/* Visit-stats — toont of klant het portaal heeft geopend */}
          <p className="text-sm mt-1" style={{ color: '#4a6358' }}>
            Portaalbezoek:{' '}
            {visitStats.visitCount === 0 ? (
              <span style={{ color: '#a05a5a' }}>nog niet geopend</span>
            ) : (
              <>
                <span style={{ color: '#053221' }}>{visitStats.visitCount}x</span>
                {visitStats.lastVisit && (
                  <>
                    {' · laatst '}
                    <span style={{ color: '#053221' }}>
                      {formatRelativeTime(visitStats.lastVisit)}
                    </span>
                  </>
                )}
              </>
            )}
          </p>

          {/* Archief-status. Bij Event: auto-cleanup 30 dagen + handmatige knop.
              Bij Personal: alleen handmatige knop (geen auto-cleanup, want klant
              wil mogelijk nog maanden later kijken). */}
          <div
            className="mt-3 pt-3 flex flex-col sm:flex-row sm:items-center gap-2"
            style={{ borderTop: '1px solid rgba(200,169,110,0.2)' }}
          >
            {client?.archivedAt ? (
              <p className="text-sm" style={{ color: '#4a6358' }}>
                Foto&apos;s gearchiveerd op{' '}
                <span style={{ color: '#053221' }}>
                  {new Date(client.archivedAt).toLocaleDateString('nl-NL')}
                </span>
              </p>
            ) : (
              <>
                <p className="text-xs flex-1" style={{ color: '#4a6358' }}>
                  {isEvent ? (
                    <>
                      Auto-cleanup 30 dagen na aanmaken.{' '}
                      {client?.archiveWarningAt &&
                        `Waarschuwingsmail verstuurd op ${new Date(client.archiveWarningAt).toLocaleDateString('nl-NL')}.`}
                    </>
                  ) : (
                    <>
                      Archiveer handmatig wanneer de klant de foto&apos;s heeft binnen.
                      Bespaart Cloudinary-opslag.
                    </>
                  )}
                </p>
                <button
                  onClick={handleArchive}
                  disabled={archiving}
                  className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80 disabled:opacity-50"
                  style={{ border: '1px solid #b54545', color: '#b54545' }}
                >
                  {archiving ? 'Bezig...' : 'Archiveer nu'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Review-flow (alleen voor personal-klanten met e-mail) */}
        {!isEvent && client?.email && (
          <div className="rounded-lg p-4" style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium tracking-widest uppercase" style={{ color: '#c8a96e' }}>
                Review-flow
              </h3>
              {client.reviewReceived && (
                <span
                  className="text-[10px] px-2 py-0.5 tracking-widest uppercase rounded-full"
                  style={{ backgroundColor: '#c8a96e', color: '#053221' }}
                >
                  ★ Review ontvangen
                </span>
              )}
            </div>

            <div className="space-y-1 text-sm mb-3" style={{ color: '#4a6358' }}>
              <p>
                Status oplevering:{' '}
                {client.deliveredAt ? (
                  <span style={{ color: '#053221' }}>
                    Opgeleverd op {new Date(client.deliveredAt).toLocaleDateString('nl-NL')}
                  </span>
                ) : (
                  <span style={{ color: '#4a6358', fontStyle: 'italic' }}>Nog niet opgeleverd</span>
                )}
              </p>
              <p>
                Review-mail:{' '}
                {client.reviewRequestedAt ? (
                  <span style={{ color: '#053221' }}>
                    Verzonden op {new Date(client.reviewRequestedAt).toLocaleDateString('nl-NL')}
                  </span>
                ) : client.deliveredAt ? (
                  <span style={{ color: '#c8a96e', fontStyle: 'italic' }}>
                    Wordt 3 dagen na oplevering automatisch verzonden
                  </span>
                ) : (
                  <span style={{ color: '#4a6358', fontStyle: 'italic' }}>
                    Markeer eerst de klant als opgeleverd
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={toggleDelivered}
                className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
                style={
                  client.deliveredAt
                    ? { border: '1px solid rgba(74,99,88,0.4)', color: '#4a6358' }
                    : { backgroundColor: '#053221', color: '#c8a96e' }
                }
              >
                {client.deliveredAt ? 'Oplevering ongedaan maken' : '✓ Markeer als opgeleverd'}
              </button>

              <button
                onClick={toggleReviewReceived}
                className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
                style={
                  client.reviewReceived
                    ? { border: '1px solid rgba(74,99,88,0.4)', color: '#4a6358' }
                    : { border: '1px solid rgba(200,169,110,0.6)', color: '#c8a96e' }
                }
              >
                {client.reviewReceived ? 'Review-vinkje weghalen' : '★ Markeer review als ontvangen'}
              </button>

              {client.deliveredAt && (
                <a
                  href={`mailto:${client.email}?subject=${encodeURIComponent('Bedankt voor de fotoshoot bij BJAY Fotografie')}&body=${encodeURIComponent(
                    `Hoi ${client.name.split(' ')[0]},\n\nHopelijk ben je blij met de foto's. Ik vond het zelf heel tof om jullie verhaal vast te leggen!\n\nMocht je een momentje hebben: zou je een korte Google-review willen achterlaten? Dat helpt me enorm om beter gevonden te worden en meer mensen blij te maken met gave fotoshoots.\n\nhttps://g.page/r/CZc1CoEHfp4HEAE/review\n\nOok als je niet kunt: dank dat ik er voor je mocht zijn!\n\nBert-Jan\nBJAY Fotografie\ninfo@bjay.photo`
                  )}`}
                  className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
                  style={{ border: '1px solid rgba(200,169,110,0.6)', color: '#c8a96e' }}
                >
                  Mail nu handmatig
                </a>
              )}
            </div>
          </div>
        )}

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
            style={{
              backgroundColor: '#fff',
              border: '2px dashed rgba(200,169,110,0.5)',
              opacity: uploading ? 0.7 : 1,
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          >
            <div className="text-center w-full">
              {uploading ? (
                <>
                  <p style={{ color: '#c8a96e' }} className="font-medium">
                    {uploadDone + uploadFailed} van {uploadTotal} verwerkt
                    {uploadFailed > 0 && (
                      <span style={{ color: '#a05a5a' }}> ({uploadFailed} mislukt)</span>
                    )}
                  </p>
                  {/* Voortgangsbalk */}
                  <div className="mt-3 mx-auto" style={{ maxWidth: 400 }}>
                    <div
                      style={{
                        height: 6,
                        backgroundColor: 'rgba(200,169,110,0.2)',
                        borderRadius: 999,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${uploadTotal ? Math.round(((uploadDone + uploadFailed) / uploadTotal) * 100) : 0}%`,
                          backgroundColor: '#c8a96e',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-xs mt-2" style={{ color: '#4a6358' }}>
                    4 foto's tegelijk uploaden — laat dit tabblad open staan tot het klaar is.
                  </p>
                </>
              ) : (
                <>
                  <p style={{ color: '#053221' }}>Klik om foto's te selecteren</p>
                  <p className="text-sm mt-1" style={{ color: '#4a6358' }}>JPG, PNG, WEBP — meerdere tegelijk OK</p>
                </>
              )}
            </div>
            <input type="file" accept="image/*" multiple className="hidden"
              onChange={handleUpload} disabled={uploading} />
          </label>
          {uploadError && <p className="text-sm mt-2" style={{ color: '#c8a96e' }}>{uploadError}</p>}
        </div>

        {/* Foto grid */}
        {photos.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <h2 className="text-lg font-light" style={{ color: '#053221' }}>
                Foto's ({photos.length})
              </h2>
              <button
                onClick={() => {
                  setExportMode(!exportMode)
                  setExportSelection([])
                  setExportError('')
                }}
                className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
                style={
                  exportMode
                    ? { backgroundColor: '#053221', color: '#c8a96e' }
                    : { border: '1px solid rgba(200,169,110,0.6)', color: '#c8a96e' }
                }
              >
                {exportMode ? 'Stop verhaal-export' : 'Verhaal-export'}
              </button>
            </div>
            <p className="text-sm mb-3" style={{ color: '#4a6358' }}>
              {exportMode
                ? 'Klik foto’s aan in de volgorde waarin ze in het verhaal moeten komen.'
                : 'Hover over een foto om deze als omslagfoto in te stellen.'}
            </p>

            {/* Verhaal-export paneel: slug + snelkeuzes + download */}
            {exportMode && (
              <div
                className="rounded-lg p-4 mb-3 flex flex-col gap-3"
                style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
              >
                <label className="text-xs" style={{ color: '#4a6358' }}>
                  Verhaal-slug (wordt de mapnaam in images/verhalen/ en de bestandsnamen)
                  <input
                    type="text"
                    value={exportSlug}
                    onChange={e => setExportSlug(e.target.value)}
                    placeholder="bv. feest-harkstede-2026"
                    className="w-full mt-1 px-2 py-1.5 text-sm font-mono focus:outline-none"
                    style={{ border: '1px solid rgba(200,169,110,0.4)', color: '#053221' }}
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {isEvent && photosByLikes.length > 0 && (
                    <button
                      onClick={selectTopLiked}
                      className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
                      style={{ border: '1px solid rgba(200,169,110,0.6)', color: '#c8a96e' }}
                    >
                      Top {Math.min(15, photosByLikes.length)} meest geliket
                    </button>
                  )}
                  <button
                    onClick={selectAllPhotos}
                    className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
                    style={{ border: '1px solid rgba(74,99,88,0.4)', color: '#4a6358' }}
                  >
                    Selecteer alles
                  </button>
                  <button
                    onClick={() => setExportSelection([])}
                    disabled={exportSelection.length === 0}
                    className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80 disabled:opacity-50"
                    style={{ border: '1px solid rgba(74,99,88,0.4)', color: '#4a6358' }}
                  >
                    Leegmaken
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={handleExport}
                    disabled={
                      exporting ||
                      exportSelection.length === 0 ||
                      !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(exportSlug.trim().toLowerCase())
                    }
                    className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80 disabled:opacity-50"
                    style={{ backgroundColor: '#053221', color: '#c8a96e' }}
                  >
                    {exporting
                      ? `${exportDone} van ${exportSelection.length}...`
                      : `Download zip (${exportSelection.length})`}
                  </button>
                </div>
                {!exporting &&
                  exportSlug.trim() !== '' &&
                  !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(exportSlug.trim().toLowerCase()) && (
                    <p className="text-xs" style={{ color: '#a05a5a' }}>
                      Slug mag alleen kleine letters, cijfers en hyphens bevatten.
                    </p>
                  )}
                {exportError && (
                  <p className="text-xs" style={{ color: '#a05a5a' }}>{exportError}</p>
                )}
                <p className="text-xs" style={{ color: '#4a6358' }}>
                  De zip bevat de foto&apos;s als webp (max 2000px, zonder watermerk) plus een
                  gallery-snippet.html voor de verhaal-pagina. Uitpakken in images/verhalen/&lt;slug&gt;/.
                </p>
              </div>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {photos.map(photo => {
                const isCover = coverUrl === photo.url
                const likeCount = likes[photo.publicId]?.count || 0
                const selectIndex = exportMode ? exportSelection.indexOf(photo.publicId) : -1
                return (
                  <div
                    key={photo.publicId}
                    className="relative overflow-hidden aspect-square group"
                    onClick={exportMode ? () => toggleExportSelect(photo.publicId) : undefined}
                    style={exportMode ? { cursor: 'pointer' } : undefined}
                  >
                    <Image src={photo.thumbnail} alt="" fill className="object-cover" />
                    {/* Export-modus: selectie-overlay met volgordenummer */}
                    {exportMode && (
                      <div
                        className="absolute inset-0 z-20 flex items-center justify-center"
                        style={{
                          backgroundColor: selectIndex >= 0 ? 'rgba(5,50,33,0.45)' : 'transparent',
                          border: selectIndex >= 0 ? '3px solid #c8a96e' : '3px solid transparent',
                        }}
                      >
                        {selectIndex >= 0 && (
                          <span
                            className="flex items-center justify-center text-sm font-bold"
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              backgroundColor: '#c8a96e',
                              color: '#053221',
                            }}
                          >
                            {selectIndex + 1}
                          </span>
                        )}
                      </div>
                    )}
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
                    {!isCover && !exportMode && (
                      <button
                        onClick={() => setCover(photo)}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 text-xs font-medium"
                        style={{ backgroundColor: 'rgba(5,50,33,0.75)', color: '#c8a96e' }}
                      >
                        Stel in als cover
                      </button>
                    )}
                    {/* Verwijder-knop, alleen zichtbaar bij hover, met z-index om over cover-knop te liggen */}
                    {!exportMode && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deletePhoto(photo) }}
                      className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition duration-200 z-10 hover:scale-110"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(160,40,40,0.9)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 'bold',
                        lineHeight: 1,
                      }}
                      title="Foto verwijderen"
                      aria-label="Foto verwijderen"
                    >
                      ×
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
