'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import PhotoGrid from '@/components/PhotoGrid'
import PhotoModal from '@/components/PhotoModal'
import NamePrompt from '@/components/NamePrompt'
import OrderCart from '@/components/OrderCart'
import TermsAccept from '@/components/TermsAccept'
import { Photo, Client } from '@/lib/types'
import { apiUrl } from '@/lib/apiUrl'

// Tijdslot-indeling voor de fijnmazige filter onder een geselecteerde dag.
// Tennistoernooien spelen meestal 09-12 ochtend, 13-18 middag, 18-22 avond.
type TimeSlot = 'ochtend' | 'middag' | 'avond'

const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  ochtend: 'Ochtend',
  middag: 'Middag',
  avond: 'Avond',
}

// 06-12 = ochtend, 12-18 = middag, 18-23 = avond. Foto's buiten dit
// (nachtdienst, sterrenfoto's etc.) krijgen geen slot — die vallen wel
// nog onder de juiste dag, alleen niet onder een specifiek slot.
function timeSlotFor(iso: string | undefined): TimeSlot | null {
  if (!iso) return null
  const hour = new Date(iso).getHours()
  if (hour >= 6 && hour < 12) return 'ochtend'
  if (hour >= 12 && hour < 18) return 'middag'
  if (hour >= 18 && hour < 23) return 'avond'
  return null
}

export default function GalleryPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const router = useRouter()

  const [photos, setPhotos] = useState<Photo[]>([])
  const [archived, setArchived] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [visitorName, setVisitorName] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [gridVisible, setGridVisible] = useState(false)
  // Cart-selectie voor digital event-bestellingen
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // Datum-filter: null = alle dagen, anders YYYY-MM-DD string
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  // Tijdslot binnen een dag: null = hele dag, anders 'ochtend' | 'middag' | 'avond'
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null)
  // Bulk-download (alleen personal): voortgang van het zippen.
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  const gridRef = useRef<HTMLDivElement>(null)

  const isEvent = client?.type === 'event'

  // Unieke datums uit photos.createdAt, gesorteerd oudste → nieuwste
  const uniqueDates = useMemo(() => {
    const set = new Set<string>()
    for (const p of photos) {
      if (p.createdAt) set.add(p.createdAt.slice(0, 10)) // YYYY-MM-DD
    }
    return Array.from(set).sort()
  }, [photos])

  // Toon datum als 'za 17 mei' style label
  function formatDateLabel(isoDate: string): string {
    const d = new Date(isoDate + 'T12:00:00')
    return d.toLocaleDateString('nl-NL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  // Foto's gefilterd op selectedDate + optioneel een tijdslot
  const visiblePhotos = useMemo(() => {
    let filtered = photos
    if (selectedDate) {
      filtered = filtered.filter(p => p.createdAt?.slice(0, 10) === selectedDate)
    }
    if (selectedTimeSlot) {
      filtered = filtered.filter(p => timeSlotFor(p.createdAt) === selectedTimeSlot)
    }
    return filtered
  }, [photos, selectedDate, selectedTimeSlot])

  // Welke tijdsloten bevatten foto's binnen de huidige geselecteerde dag?
  // Toont alleen chips voor slots die echt foto's hebben, anders is het ruis.
  const availableTimeSlots = useMemo<TimeSlot[]>(() => {
    if (!selectedDate) return []
    const set = new Set<TimeSlot>()
    for (const p of photos) {
      if (p.createdAt?.slice(0, 10) !== selectedDate) continue
      const slot = timeSlotFor(p.createdAt)
      if (slot) set.add(slot)
    }
    // Behoud volgorde ochtend → middag → avond
    const order: TimeSlot[] = ['ochtend', 'middag', 'avond']
    return order.filter(s => set.has(s))
  }, [photos, selectedDate])

  // Reset tijdslot zodra je een andere dag kiest (of alle dagen).
  useEffect(() => {
    setSelectedTimeSlot(null)
  }, [selectedDate])
  const visitorStorageKey = useMemo(() => `bjay:visitor:${clientId}`, [clientId])
  const cartStorageKey = useMemo(() => `bjay:cart:${clientId}`, [clientId])

  // Visitor naam uit localStorage lezen
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(visitorStorageKey)
    if (stored) setVisitorName(stored)
  }, [visitorStorageKey])

  // Cart-selectie uit localStorage lezen
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(cartStorageKey)
    if (stored) {
      try {
        const arr = JSON.parse(stored)
        if (Array.isArray(arr)) setSelectedIds(arr)
      } catch {
        // ignore
      }
    }
  }, [cartStorageKey])

  // Cart-selectie naar localStorage schrijven bij elke wijziging
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (selectedIds.length === 0) {
      window.localStorage.removeItem(cartStorageKey)
    } else {
      window.localStorage.setItem(cartStorageKey, JSON.stringify(selectedIds))
    }
  }, [cartStorageKey, selectedIds])

  // Foto's, client, cover laden
  useEffect(() => {
    async function load() {
      const [photosRes, clientRes, coverRes] = await Promise.all([
        fetch(apiUrl(`/api/clients/${clientId}/photos`)),
        fetch(apiUrl(`/api/clients/${clientId}`)),
        fetch(apiUrl(`/api/clients/${clientId}/cover`)),
      ])

      if (photosRes.status === 401) {
        router.push('/login')
        return
      }

      const photosData = await photosRes.json()
      const clientData = await clientRes.json()
      const coverData = await coverRes.json()

      setPhotos(photosData.photos || [])
      setArchived(Boolean(photosData.archived))
      setClient(clientData.client || null)
      setCoverUrl(coverData.cover || null)
      setLoading(false)

      // Visit-tracking — fire-and-forget. Eenmaal per tab-sessie via
      // sessionStorage, anders inflate-en F5's de teller.
      try {
        const visitKey = `bjay:visit:${clientId}`
        if (!sessionStorage.getItem(visitKey)) {
          sessionStorage.setItem(visitKey, '1')
          fetch(apiUrl(`/api/clients/${clientId}/visit`), { method: 'POST' }).catch(() => {})
        }
      } catch {
        // sessionStorage kan falen (private mode etc.); negeer
      }
    }

    load()
  }, [clientId, router])

  // Favorieten of likes laden
  useEffect(() => {
    if (!client) return

    async function loadInteractions() {
      if (client?.type === 'event') {
        if (!visitorName) return
        const url = apiUrl(`/api/clients/${clientId}/likes?name=${encodeURIComponent(visitorName)}`)
        const res = await fetch(url)
        if (!res.ok) return
        const data = await res.json()
        setFavorites(data.mine || [])
        setLikeCounts(data.counts || {})
      } else {
        const res = await fetch(apiUrl(`/api/clients/${clientId}/favorites`))
        if (!res.ok) return
        const data = await res.json()
        setFavorites(data.favorites || [])
        setLikeCounts({})
      }
    }

    loadInteractions()
  }, [client, clientId, visitorName])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setGridVisible(true) },
      // threshold 0: zodra het rooster ook maar in beeld komt. Niet 0.05 (5%):
      // bij veel foto's is het rooster zo hoog dat er nooit 5% tegelijk zichtbaar
      // is, waardoor de fade-in nooit afging en het rooster op opacity 0 bleef
      // (onzichtbaar maar wel klikbaar).
      { threshold: 0 }
    )
    if (gridRef.current) observer.observe(gridRef.current)
    return () => observer.disconnect()
  }, [loading])

  async function toggleFavorite(photoId: string) {
    if (client?.type === 'event') {
      if (!visitorName) return
      const wasMine = favorites.includes(photoId)

      setFavorites(prev =>
        wasMine ? prev.filter(id => id !== photoId) : [...prev, photoId]
      )
      setLikeCounts(prev => {
        const current = prev[photoId] || 0
        const next = wasMine ? Math.max(0, current - 1) : current + 1
        return { ...prev, [photoId]: next }
      })

      await fetch(apiUrl(`/api/clients/${clientId}/likes`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId, name: visitorName }),
      })
    } else {
      const isFav = favorites.includes(photoId)
      setFavorites(prev =>
        isFav ? prev.filter(id => id !== photoId) : [...prev, photoId]
      )
      await fetch(apiUrl(`/api/clients/${clientId}/favorites`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId }),
      })
    }
  }

  function toggleSelection(photoId: string) {
    setSelectedIds(prev =>
      prev.includes(photoId) ? prev.filter(id => id !== photoId) : [...prev, photoId]
    )
  }

  function clearSelection() {
    setSelectedIds([])
  }

  // Personal: alle foto's in één ZIP downloaden (client-side, schone originelen).
  async function downloadAll() {
    if (downloadingAll || photos.length === 0) return
    setDownloadingAll(true)
    setDownloadProgress(0)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      let nextIndex = 0
      let done = 0
      async function worker() {
        while (true) {
          const i = nextIndex++
          if (i >= photos.length) return
          const p = photos[i]
          try {
            const r = await fetch(p.downloadUrl || p.url)
            if (r.ok) {
              const base = p.publicId.split('/').pop() || `foto-${i + 1}`
              const name = /\.(jpe?g|png|webp)$/i.test(base) ? base : `${base}.jpg`
              zip.file(name, await r.blob())
            }
          } catch {
            // sla deze foto over bij een fout
          }
          done++
          setDownloadProgress(done)
        }
      }
      await Promise.all(Array.from({ length: Math.min(4, photos.length) }, () => worker()))
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${client?.name || 'fotos'}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingAll(false)
    }
  }

  // History API: push state bij modal open zodat browser-back de modal sluit
  function openPhoto(photo: Photo) {
    setSelectedPhoto(photo)
    if (typeof window !== 'undefined') {
      window.history.pushState({ modal: 'photo' }, '', window.location.href)
    }
  }

  function closePhoto() {
    if (typeof window !== 'undefined' && window.history.state?.modal === 'photo') {
      // back() triggert popstate die setSelectedPhoto(null) doet
      window.history.back()
    } else {
      setSelectedPhoto(null)
    }
  }

  useEffect(() => {
    function onPopState() {
      setSelectedPhoto(null)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function handleNameSubmit(name: string) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(visitorStorageKey, name)
    }
    setVisitorName(name)
  }

  async function handleLogout() {
    await fetch(apiUrl('/api/auth/logout'), {
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

  // Voorwaarden-gate (alleen personal, en alleen als de boekingsmail is
  // verstuurd): geen toegang tot de foto's tot de klant akkoord is op de
  // algemene voorwaarden. Door te koppelen aan bookingMailSentAt worden
  // bestaande klanten (zonder dit flow) niet ineens geblokkeerd. Events delen
  // een code met bezoekers, dus daar nooit een gate.
  if (client && client.type !== 'event' && client.bookingMailSentAt && !client.termsAcceptedAt) {
    return (
      <TermsAccept
        client={client}
        onAccept={async () => {
          const res = await fetch(apiUrl(`/api/clients/${clientId}/accept-terms`), { method: 'POST' })
          if (!res.ok) throw new Error('accept failed')
          const data = await res.json()
          setClient(data.client)
        }}
      />
    )
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#e8ede9' }}>

      {isEvent && !visitorName && (
        <NamePrompt eventName={client?.name} onSubmit={handleNameSubmit} />
      )}

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
        <div className="flex items-center gap-4">
          {isEvent && visitorName && (
            <span className="text-xs hidden sm:inline" style={{ color: 'rgba(232,237,233,0.6)' }}>
              Hi, {visitorName}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm transition hover:opacity-70"
            style={{ color: 'rgba(232,237,233,0.6)' }}
          >
            Uitloggen
          </button>
        </div>
      </header>

      {/* Hero */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{ height: '100vh', backgroundColor: '#080f0c' }}
      >
        {coverUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.85 }}
          />
        )}
        <div className="relative text-center px-6 z-10">
          <p className="text-sm tracking-widest uppercase mb-3" style={{ color: 'rgba(200,169,110,0.9)' }}>
            {isEvent ? 'Evenement galerij' : 'Jouw galerij'}
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
          <div className="flex flex-col items-center gap-2 animate-bounce"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>

      <div ref={gridRef}>
        <div
          className="px-6 py-4 flex items-center justify-between sticky top-14 z-30"
          style={{ backgroundColor: '#053221', borderBottom: '1px solid rgba(200,169,110,0.2)' }}
        >
          <div>
            <p className="text-xs tracking-widest uppercase" style={{ color: 'rgba(200,169,110,0.6)' }}>
              {client?.name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(232,237,233,0.4)' }}>
              {visiblePhotos.length} foto{visiblePhotos.length !== 1 ? "'s" : ''}
              {selectedDate && photos.length !== visiblePhotos.length && (
                <span> van {photos.length}</span>
              )}
            </p>
          </div>
        </div>

        <div className="mx-auto px-4" style={{ maxWidth: '80rem' }}>
          {/* Bestel-uitleg banner */}
          {photos.length > 0 && (
            <div className="mt-6">
              <div
                className="rounded-lg p-4 sm:p-5"
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid rgba(200,169,110,0.4)',
                  boxShadow: '0 1px 3px rgba(5,50,33,0.06)',
                }}
              >
                <h3
                  className="text-sm font-medium tracking-widest uppercase mb-3"
                  style={{ color: '#053221' }}
                >
                  {isEvent ? "Je foto's" : "Je foto's"}
                </h3>

                {isEvent && (
                  <p className="text-sm mb-4" style={{ color: '#4a6358' }}>
                    Alle foto&apos;s van dit event kun je <strong style={{ color: '#053221' }}>gratis downloaden</strong> in de foto-weergave, in lagere resolutie met watermerk. Wil je een foto in hoge resolutie zonder watermerk? Volg dan de stappen hieronder om te bestellen.
                  </p>
                )}

                <div
                  className={`grid grid-cols-1 gap-3 sm:gap-4 mb-4 ${
                    isEvent ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'
                  }`}
                >
                  {(isEvent
                    ? [
                        { n: '1', t: 'Selecteer', d: 'Tik op de + knop bij elke foto die je wilt' },
                        { n: '2', t: 'Checkout', d: 'Klik onderin op de groene checkout-knop' },
                        { n: '3', t: 'Per mail', d: 'Na betaling ontvang je de foto(s) in hoge resolutie zonder watermerk per mail' },
                        {
                          n: '4',
                          t: 'Tevreden?',
                          d: 'Laat een korte Google-review achter, dit helpt me enorm.',
                          href: 'https://g.page/r/CZc1CoEHfp4HEAE/review',
                        },
                      ]
                    : [
                        { n: '1', t: 'Downloaden', d: 'Download een foto los in de foto-weergave, of allemaal in één keer hieronder.' },
                        { n: '2', t: 'Afdruk?', d: 'Een fysieke afdruk bestel je per foto in de foto-weergave.' },
                        { n: '3', t: 'Tag me!', d: 'Post je een foto? Tag @bjay.photo, dan deel ik hem in mn story.' },
                      ]
                  ).map((step: { n: string; t: string; d: string; href?: string }) => (
                    <div key={step.n} className="flex gap-3 items-start">
                      <div
                        className="flex-shrink-0 flex items-center justify-center text-sm font-bold"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          backgroundColor: step.href ? '#c8a96e' : '#053221',
                          color: step.href ? '#053221' : '#c8a96e',
                        }}
                      >
                        {step.href ? '★' : step.n}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#053221' }}>
                          {step.t}
                        </p>
                        {step.href ? (
                          <p className="text-xs mt-0.5" style={{ color: '#4a6358' }}>
                            {step.d}{' '}
                            <a
                              href={step.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline font-medium whitespace-nowrap"
                              style={{ color: '#c8a96e' }}
                            >
                              Schrijf review →
                            </a>
                          </p>
                        ) : (
                          <p className="text-xs mt-0.5" style={{ color: '#4a6358' }}>
                            {step.d}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className="rounded p-3 text-xs"
                  style={{ backgroundColor: 'rgba(200,169,110,0.1)', color: '#053221' }}
                >
                  {isEvent ? (
                    <>
                      <strong>Tarieven (digitale download):</strong>{' '}
                      <span style={{ color: '#4a6358' }}>1 foto €5 · 3 foto&apos;s €12 · 5 foto&apos;s €18</span>
                    </>
                  ) : (
                    <span style={{ color: '#4a6358' }}>Afdrukken bestel je per foto in de foto-weergave.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Personal: alles in één keer downloaden + tag-zin */}
          {!isEvent && photos.length > 0 && (
            <div
              className="mt-4 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              style={{ backgroundColor: '#053221' }}
            >
              <div>
                <p className="text-base font-medium" style={{ color: '#f5f4f0' }}>
                  Post je een foto? Tag <strong style={{ color: '#c8a96e' }}>@bjay.photo</strong>
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(232,237,233,0.7)' }}>
                  Dan deel ik &apos;m in mn story. Je foto&apos;s staan in hoge resolutie klaar om te downloaden.
                </p>
              </div>
              <button
                onClick={downloadAll}
                disabled={downloadingAll}
                className="px-5 py-2.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80 disabled:opacity-60 flex-shrink-0"
                style={{ backgroundColor: '#c8a96e', color: '#053221' }}
              >
                {downloadingAll
                  ? `Bezig... ${downloadProgress}/${photos.length}`
                  : "Download alle foto's"}
              </button>
            </div>
          )}

          {/* Datum-filter chips (alleen events, en bij 2+ unieke datums).
              Personal-shoots tonen alles chronologisch zonder filter. */}
          {isEvent && uniqueDates.length >= 2 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedDate(null)}
                className="px-3 py-1.5 text-xs tracking-widest uppercase transition"
                style={{
                  backgroundColor: selectedDate === null ? '#053221' : '#fff',
                  color: selectedDate === null ? '#c8a96e' : '#053221',
                  border: '1px solid rgba(200,169,110,0.4)',
                  borderRadius: '999px',
                }}
              >
                Alle dagen
              </button>
              {uniqueDates.map(date => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className="px-3 py-1.5 text-xs tracking-widest uppercase transition"
                  style={{
                    backgroundColor: selectedDate === date ? '#053221' : '#fff',
                    color: selectedDate === date ? '#c8a96e' : '#053221',
                    border: '1px solid rgba(200,169,110,0.4)',
                    borderRadius: '999px',
                  }}
                >
                  {formatDateLabel(date)}
                </button>
              ))}
            </div>
          )}

          {/* Tijdslot-chips: alleen tonen als er een dag is geselecteerd en
              er 2+ tijdsloten foto's hebben (anders nutteloos). Helpt
              tennissers hun specifieke match-moment snel terug te vinden. */}
          {isEvent && selectedDate && availableTimeSlots.length >= 2 && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTimeSlot(null)}
                className="px-2.5 py-1 text-[11px] tracking-widest uppercase transition"
                style={{
                  backgroundColor: selectedTimeSlot === null ? '#c8a96e' : '#fff',
                  color: selectedTimeSlot === null ? '#053221' : '#4a6358',
                  border: '1px solid rgba(200,169,110,0.4)',
                  borderRadius: '999px',
                }}
              >
                Hele dag
              </button>
              {availableTimeSlots.map(slot => (
                <button
                  key={slot}
                  onClick={() => setSelectedTimeSlot(slot)}
                  className="px-2.5 py-1 text-[11px] tracking-widest uppercase transition"
                  style={{
                    backgroundColor: selectedTimeSlot === slot ? '#c8a96e' : '#fff',
                    color: selectedTimeSlot === slot ? '#053221' : '#4a6358',
                    border: '1px solid rgba(200,169,110,0.4)',
                    borderRadius: '999px',
                  }}
                >
                  {TIME_SLOT_LABELS[slot]}
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              // Extra padding-bottom om sticky cart-balk niet over foto's heen te laten vallen
              paddingTop: '1.5rem',
              paddingBottom: '28rem',
              opacity: gridVisible ? 1 : 0,
              transform: gridVisible ? 'translateY(0)' : 'translateY(24px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
          >
            {visiblePhotos.length === 0 ? (
              <div className="flex items-center justify-center px-4 py-12">
                {archived ? (
                  <div
                    className="max-w-md text-center rounded-lg p-6"
                    style={{
                      backgroundColor: '#fff',
                      border: '1px solid rgba(200,169,110,0.4)',
                    }}
                  >
                    <p
                      className="text-lg font-medium mb-3"
                      style={{ color: '#053221', fontFamily: 'var(--font-jost), sans-serif' }}
                    >
                      Foto&apos;s zijn niet meer beschikbaar
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: '#4a6358' }}>
                      De foto&apos;s van dit event zijn na de bewaartermijn van 30 dagen
                      uit het portaal gehaald. Wil je een foto alsnog ontvangen?
                      Stuur even een mail naar{' '}
                      <a
                        href="mailto:info@bjay.photo?subject=Foto%20aanvraag%20uit%20event"
                        className="underline font-medium"
                        style={{ color: '#053221' }}
                      >
                        info@bjay.photo
                      </a>{' '}
                      met de naam van het event, dan kijk ik wat er nog mogelijk is.
                    </p>
                  </div>
                ) : (
                  <p style={{ color: '#4a6358' }}>
                    {photos.length === 0
                      ? "Er zijn nog geen foto's beschikbaar."
                      : "Geen foto's op deze datum."}
                  </p>
                )}
              </div>
            ) : (
              <PhotoGrid
                photos={visiblePhotos}
                favorites={favorites}
                onSelect={openPhoto}
                onToggleFavorite={toggleFavorite}
                likeCounts={isEvent ? likeCounts : undefined}
                selectedIds={isEvent ? selectedIds : undefined}
                onToggleSelection={isEvent ? toggleSelection : undefined}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          photos={visiblePhotos}
          isFavorite={favorites.includes(selectedPhoto.publicId)}
          onClose={closePhoto}
          onToggleFavorite={toggleFavorite}
          clientId={clientId}
          clientName={client?.name}
          clientEmail={client?.email}
          likeCounts={isEvent ? likeCounts : undefined}
          selectedIds={isEvent ? selectedIds : undefined}
          onToggleSelection={isEvent ? toggleSelection : undefined}
          showPrintOption={!isEvent}
        />
      )}

      {/* Cart bar + checkout - alleen voor events (personal downloadt schoon) */}
      {client && isEvent && (
        <OrderCart
          photos={photos}
          selectedIds={selectedIds}
          clientId={clientId}
          clientName={client?.name}
          tier={isEvent ? 'event' : 'personal'}
          onRemove={(photoId) => setSelectedIds(prev => prev.filter(id => id !== photoId))}
          onClear={clearSelection}
          onPlaced={() => {
            // Optioneel iets doen na succesvolle bestelling
          }}
        />
      )}
    </main>
  )
}
