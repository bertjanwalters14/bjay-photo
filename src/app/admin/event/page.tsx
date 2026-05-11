'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const DEFAULT_LOGIN_URL = 'https://bjay-photo.vercel.app/login'

export default function AdminEventPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [active, setActive] = useState(false)
  const [label, setLabel] = useState('Live nu')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [password, setPassword] = useState('')
  const [loginUrl, setLoginUrl] = useState(DEFAULT_LOGIN_URL)
  const [dismissKey, setDismissKey] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/active-event', { cache: 'no-store' })
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        if (res.ok) {
          const data = await res.json()
          setActive(Boolean(data.active))
          setLabel(data.label || 'Live nu')
          setName(data.name || '')
          setDescription(data.description || '')
          setPassword(data.password || '')
          setLoginUrl(data.loginUrl || DEFAULT_LOGIN_URL)
          setDismissKey(data.dismissKey || '')
        }
      } catch {
        // negeren — popup blijft uit
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    const res = await fetch('/api/active-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        active,
        label,
        name,
        description,
        password,
        loginUrl,
        dismissKey,
      }),
    })

    try {
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Er ging iets mis bij het opslaan')
      } else {
        setMessage(active ? 'Event is opgeslagen en LIVE' : 'Event is opgeslagen (niet actief)')
      }
    } catch {
      setError('Er ging iets mis bij het opslaan')
    }
    setSaving(false)
  }

  async function handleClear() {
    if (!confirm('Weet je zeker dat je het event volledig wilt wissen?')) return
    setSaving(true)
    setMessage('')
    setError('')

    const res = await fetch('/api/active-event', { method: 'DELETE' })
    if (res.ok) {
      setActive(false)
      setLabel('Live nu')
      setName('')
      setDescription('')
      setPassword('')
      setLoginUrl(DEFAULT_LOGIN_URL)
      setDismissKey('')
      setMessage('Event gewist')
    } else {
      setError('Wissen mislukt')
    }
    setSaving(false)
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    color: '#053221',
    border: '1px solid rgba(200,169,110,0.4)',
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#e8ede9' }}>
      <header
        className="px-6 py-4 flex items-center justify-between"
        style={{ backgroundColor: '#053221' }}
      >
        <div className="flex items-center gap-3">
          <Image
            src="/logoBJAYv3.0-iconbackground.png"
            alt="Bjay.photo"
            width={32}
            height={32}
          />
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
            / Event popup
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

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div
          className="rounded-lg p-6 mb-4"
          style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
        >
          <h2
            className="text-lg font-light mb-2 tracking-wide"
            style={{ color: '#053221' }}
          >
            Event popup op bjay.photo
          </h2>
          <p className="text-xs mb-6" style={{ color: '#4a6358' }}>
            Configureer hier de pop-up die op de openbare website verschijnt
            tijdens een evenement (zoals GLTB Open). Bezoekers krijgen de
            wachtwoord-info en een directe link naar de klanten-login.
          </p>

          {loading ? (
            <p style={{ color: '#4a6358' }}>Laden...</p>
          ) : (
            <form onSubmit={handleSave} className="flex flex-col gap-5">
              {/* Actief toggle */}
              <div>
                <label
                  className="block text-xs tracking-widest uppercase mb-2"
                  style={{ color: '#4a6358' }}
                >
                  Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActive(false)}
                    className="py-3 text-xs font-medium tracking-widest uppercase transition"
                    style={{
                      backgroundColor: !active ? '#053221' : '#fff',
                      color: !active ? '#c8a96e' : '#053221',
                      border: '1px solid rgba(200,169,110,0.4)',
                    }}
                  >
                    Uit
                  </button>
                  <button
                    type="button"
                    onClick={() => setActive(true)}
                    className="py-3 text-xs font-medium tracking-widest uppercase transition"
                    style={{
                      backgroundColor: active ? '#c8a96e' : '#fff',
                      color: active ? '#053221' : '#053221',
                      border: '1px solid rgba(200,169,110,0.4)',
                    }}
                  >
                    Live
                  </button>
                </div>
                <p className="text-xs mt-2" style={{ color: '#4a6358' }}>
                  Op &quot;Live&quot; zien bezoekers de popup. Op &quot;Uit&quot; blijft hij verborgen.
                </p>
              </div>

              {/* Naam */}
              <div>
                <label
                  className="block text-xs tracking-widest uppercase mb-2"
                  style={{ color: '#4a6358' }}
                >
                  Naam van het evenement *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Bv. GLTB Open 2025"
                  required={active}
                  className="w-full px-4 py-3 text-sm focus:outline-none transition"
                  style={inputStyle}
                />
              </div>

              {/* Label */}
              <div>
                <label
                  className="block text-xs tracking-widest uppercase mb-2"
                  style={{ color: '#4a6358' }}
                >
                  Kleine label bovenaan
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="Live nu"
                  className="w-full px-4 py-3 text-sm focus:outline-none transition"
                  style={inputStyle}
                />
                <p className="text-xs mt-2" style={{ color: '#4a6358' }}>
                  Verschijnt in goud bovenaan de popup. Bv. &quot;Live nu&quot;, &quot;Foto&apos;s online&quot; etc.
                </p>
              </div>

              {/* Beschrijving */}
              <div>
                <label
                  className="block text-xs tracking-widest uppercase mb-2"
                  style={{ color: '#4a6358' }}
                >
                  Beschrijving
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Heb je meegedaan of toegekeken? De foto's staan online. Bekijk en bestel direct."
                  rows={3}
                  className="w-full px-4 py-3 text-sm focus:outline-none transition"
                  style={inputStyle}
                />
              </div>

              {/* Wachtwoord */}
              <div>
                <label
                  className="block text-xs tracking-widest uppercase mb-2"
                  style={{ color: '#4a6358' }}
                >
                  Wachtwoord (optioneel)
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Bv. gltb2025"
                  className="w-full px-4 py-3 text-sm focus:outline-none transition font-mono"
                  style={inputStyle}
                />
                <p className="text-xs mt-2" style={{ color: '#4a6358' }}>
                  Leeg laten als je het wachtwoord niet zichtbaar op de website wilt tonen.
                </p>
              </div>

              {/* Login URL */}
              <div>
                <label
                  className="block text-xs tracking-widest uppercase mb-2"
                  style={{ color: '#4a6358' }}
                >
                  Login-URL
                </label>
                <input
                  type="url"
                  value={loginUrl}
                  onChange={e => setLoginUrl(e.target.value)}
                  placeholder={DEFAULT_LOGIN_URL}
                  className="w-full px-4 py-3 text-sm focus:outline-none transition font-mono"
                  style={inputStyle}
                />
              </div>

              {/* Dismiss key */}
              <div>
                <label
                  className="block text-xs tracking-widest uppercase mb-2"
                  style={{ color: '#4a6358' }}
                >
                  Dismiss-key (uniek per evenement) *
                </label>
                <input
                  type="text"
                  value={dismissKey}
                  onChange={e =>
                    setDismissKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }
                  placeholder="bv. gltb-open-2025"
                  required={active}
                  className="w-full px-4 py-3 text-sm focus:outline-none transition font-mono tracking-widest"
                  style={inputStyle}
                />
                <p className="text-xs mt-2" style={{ color: '#4a6358' }}>
                  Bezoekers die de popup wegklikken zien hem niet meer. Met een nieuwe key voor een volgend event zien ze hem wel weer.
                </p>
              </div>

              {message && (
                <p
                  className="text-xs px-3 py-2"
                  style={{ color: '#053221', backgroundColor: 'rgba(200,169,110,0.2)' }}
                >
                  {message}
                </p>
              )}
              {error && (
                <p className="text-xs" style={{ color: '#c8a96e' }}>
                  {error}
                </p>
              )}

              <div className="flex gap-3 mt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 text-xs font-medium tracking-widest uppercase transition disabled:opacity-40"
                  style={{ backgroundColor: '#053221', color: '#c8a96e' }}
                >
                  {saving ? 'Bezig...' : 'Opslaan'}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={saving}
                  className="px-6 py-3 text-xs font-medium tracking-widest uppercase transition disabled:opacity-40"
                  style={{
                    backgroundColor: '#fff',
                    color: '#053221',
                    border: '1px solid rgba(74,99,88,0.4)',
                  }}
                >
                  Wissen
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Hulpinfo */}
        <div
          className="rounded-lg p-4 text-xs"
          style={{ backgroundColor: 'rgba(255,255,255,0.5)', color: '#4a6358' }}
        >
          <p className="font-medium mb-2" style={{ color: '#053221' }}>
            Hoe werkt het?
          </p>
          <p className="mb-1">
            • Bezoekers van bjay.photo zien de popup ~1,5 seconde na het laden van een pagina.
          </p>
          <p className="mb-1">
            • Ze kunnen 'm wegklikken via het kruisje, Escape, of buiten de popup klikken.
          </p>
          <p className="mb-1">
            • Wie hem wegklikt, ziet hem voor dit event niet meer (browser-localStorage met de dismiss-key).
          </p>
          <p>
            • Bij een nieuw event gebruik je een nieuwe dismiss-key, dan zien dezelfde bezoekers de popup weer.
          </p>
        </div>
      </div>
    </main>
  )
}
