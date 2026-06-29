'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { RecentPhoto } from '@/lib/types'

const EMPTY_SLOT: RecentPhoto = { url: '', alt: '', href: '', publicId: '' }

export default function AdminRecentPage() {
  const router = useRouter()
  const [slots, setSlots] = useState<RecentPhoto[]>([EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT])
  // Eén gedeelde link voor alle vier de tegels (het is altijd één shoot).
  const [sharedLink, setSharedLink] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/recent', { cache: 'no-store' })
    if (res.status === 401) {
      router.push('/admin/login')
      return
    }
    const data = await res.json()
    const existing: RecentPhoto[] = Array.isArray(data.photos) ? data.photos : []
    const filled = [0, 1, 2, 3].map(i => existing[i] || { ...EMPTY_SLOT })
    setSlots(filled)
    // De gedeelde link = de eerste niet-lege href die we vinden.
    setSharedLink(filled.find(s => s.href)?.href || '')
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function updateSlot(idx: number, patch: Partial<RecentPhoto>) {
    setSlots(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
    setSavedAt(null)
  }

  async function handleUpload(idx: number, file: File) {
    setUploading(idx)
    try {
      // 1. signature ophalen
      const sigRes = await fetch('/api/recent/signature', { method: 'POST' })
      if (!sigRes.ok) throw new Error('Signature ophalen mislukt')
      const sig = await sigRes.json()

      // 2. direct uploaden naar Cloudinary
      const form = new FormData()
      form.append('file', file)
      form.append('api_key', sig.apiKey)
      form.append('timestamp', String(sig.timestamp))
      form.append('signature', sig.signature)
      form.append('folder', sig.folder)
      form.append('use_filename', 'true')
      form.append('unique_filename', 'true')

      const upRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: 'POST', body: form },
      )
      if (!upRes.ok) throw new Error('Upload naar Cloudinary mislukt')
      const upJson = await upRes.json()

      updateSlot(idx, { url: upJson.secure_url, publicId: upJson.public_id })
    } catch (err) {
      console.error(err)
      alert('Upload mislukt. Probeer opnieuw of check je internet.')
    } finally {
      setUploading(null)
    }
  }

  async function save() {
    setSaving(true)
    // Gedeelde link op elke tegel zetten, zodat klikken op een willekeurige
    // tegel naar hetzelfde verhaal gaat.
    const link = sharedLink.trim()
    const photos = slots.map(s => ({ ...s, href: link }))
    const res = await fetch('/api/recent', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos }),
    })
    setSaving(false)
    if (res.ok) {
      setSavedAt(new Date().toLocaleTimeString('nl-NL'))
    } else {
      alert('Opslaan mislukt. Probeer het opnieuw.')
    }
  }

  function moveSlot(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target > 3) return
    setSlots(prev => {
      const copy = [...prev]
      ;[copy[idx], copy[target]] = [copy[target], copy[idx]]
      return copy
    })
    setSavedAt(null)
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#e8ede9' }}>
      <header
        className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={{ backgroundColor: '#053221' }}
      >
        <div className="flex items-center gap-3">
          <Image src="/logoBJAYv3.0-iconbackground.png" alt="Bjay.photo" width={32} height={32} />
          <h1
            className="text-xl font-bold tracking-widest uppercase"
            style={{ color: '#c8a96e', fontFamily: 'var(--font-jost), sans-serif' }}
          >
            Bjay.photo
          </h1>
          <span
            className="text-xs tracking-widest uppercase"
            style={{ color: 'rgba(200,169,110,0.5)' }}
          >
            / Recente momenten
          </span>
        </div>
        <button
          onClick={() => router.push('/admin/dashboard')}
          className="text-sm transition hover:opacity-70"
          style={{ color: 'rgba(232,237,233,0.6)' }}
        >
          ← Dashboard
        </button>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-lg font-light mb-2 tracking-wide" style={{ color: '#053221' }}>
          Meest recente momenten
        </h2>
        <p className="text-xs mb-6 leading-relaxed" style={{ color: '#4a6358' }}>
          De vier tegels die op bjay.photo onder &quot;Meest recente momenten&quot; staan.
          Wissel ze hier zonder dat de site opnieuw uitgerold hoeft te worden. Klik
          op &quot;Foto uploaden&quot; om een nieuw beeld toe te voegen, vul de alt-tekst
          en eventueel een link in, en druk op opslaan.
        </p>

        {loading ? (
          <p style={{ color: '#4a6358' }}>Laden...</p>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {slots.map((slot, idx) => (
                <div
                  key={idx}
                  className="rounded-lg p-4 flex flex-col sm:flex-row gap-4"
                  style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
                >
                  {/* Preview + upload */}
                  <div className="flex-shrink-0 flex flex-col items-start gap-2 w-full sm:w-40">
                    <div
                      className="w-full sm:w-40 relative overflow-hidden"
                      style={{
                        aspectRatio: '4/5',
                        backgroundColor: '#e8ede9',
                        border: '1px dashed rgba(74,99,88,0.3)',
                      }}
                    >
                      {slot.url ? (
                        <img
                          src={slot.url}
                          alt={slot.alt || `Slot ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs tracking-widest uppercase" style={{ color: '#4a6358' }}>
                          Slot {idx + 1}
                        </div>
                      )}
                    </div>
                    <label
                      className="w-full text-center px-3 py-2 text-xs font-medium tracking-widest uppercase transition hover:opacity-80 cursor-pointer"
                      style={{ backgroundColor: '#053221', color: '#c8a96e' }}
                    >
                      {uploading === idx ? 'Uploaden...' : slot.url ? 'Vervangen' : 'Foto uploaden'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading !== null}
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) handleUpload(idx, file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>

                  {/* Form-velden */}
                  <div className="flex-1 flex flex-col gap-3 min-w-0">
                    <div>
                      <label className="text-[10px] tracking-widest uppercase block mb-1" style={{ color: '#4a6358' }}>
                        Slot {idx + 1}
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => moveSlot(idx, -1)}
                          disabled={idx === 0}
                          className="px-2 py-1 text-xs transition hover:opacity-80 disabled:opacity-30"
                          style={{ border: '1px solid rgba(74,99,88,0.4)', color: '#4a6358' }}
                          aria-label="Naar boven"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveSlot(idx, 1)}
                          disabled={idx === 3}
                          className="px-2 py-1 text-xs transition hover:opacity-80 disabled:opacity-30"
                          style={{ border: '1px solid rgba(74,99,88,0.4)', color: '#4a6358' }}
                          aria-label="Naar beneden"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => updateSlot(idx, { ...EMPTY_SLOT })}
                          className="px-2 py-1 text-xs transition hover:opacity-80"
                          style={{ border: '1px solid rgba(74,99,88,0.4)', color: '#4a6358' }}
                        >
                          Leegmaken
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] tracking-widest uppercase block mb-1" style={{ color: '#4a6358' }}>
                        Alt-tekst (omschrijving voor Google en screenreaders)
                      </label>
                      <input
                        type="text"
                        value={slot.alt}
                        onChange={e => updateSlot(idx, { alt: e.target.value })}
                        placeholder="Bijv. Hyrox atleet tijdens sled push"
                        className="w-full px-3 py-2 text-sm"
                        style={{ border: '1px solid rgba(5,50,33,0.18)', backgroundColor: '#fff' }}
                      />
                    </div>

                    {slot.url && (
                      <p className="text-[10px] break-all" style={{ color: '#c8a96e' }}>
                        {slot.url}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Gedeelde link voor alle tegels */}
            <div
              className="mt-4 rounded-lg p-4"
              style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
            >
              <label className="text-[10px] tracking-widest uppercase block mb-1" style={{ color: '#4a6358' }}>
                Link voor alle tegels (optioneel)
              </label>
              <input
                type="text"
                value={sharedLink}
                onChange={e => { setSharedLink(e.target.value); setSavedAt(null) }}
                placeholder="Bv. https://bjay.photo/verhalen/hyrox-heerenveen-2026"
                className="w-full px-3 py-2 text-sm"
                style={{ border: '1px solid rgba(5,50,33,0.18)', backgroundColor: '#fff', color: '#053221' }}
              />
              <p className="text-xs mt-2 leading-relaxed" style={{ color: '#4a6358' }}>
                Klikken op een van de tegels gaat naar deze pagina (de foto&apos;s zijn altijd van
                dezelfde shoot). Leeg laten = de tegels zijn niet klikbaar.
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={save}
                disabled={saving || uploading !== null}
                className="px-6 py-3 text-xs font-medium tracking-widest uppercase transition hover:opacity-80 disabled:opacity-40"
                style={{ backgroundColor: '#c8a96e', color: '#053221' }}
              >
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
              {savedAt && (
                <p className="text-xs" style={{ color: '#4a6358' }}>
                  ✓ Opgeslagen om {savedAt}. Refresh bjay.photo om het resultaat te zien.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
