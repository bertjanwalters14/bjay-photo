'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const DEFAULT_LOGIN_URL = 'https://bjay-photo.vercel.app/login'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

export default function NewEventPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [label, setLabel] = useState('Live nu')
  const [description, setDescription] = useState('')
  const [password, setPassword] = useState('')
  const [loginUrl, setLoginUrl] = useState(DEFAULT_LOGIN_URL)
  const [popupActive, setPopupActive] = useState(false)
  const [requestable, setRequestable] = useState(true)

  function handleNameChange(value: string) {
    setName(value)
    if (!slugManual) setSlug(slugify(value))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const dismissKey = `${slug}-dismissed`

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        slug,
        label,
        description,
        password,
        loginUrl,
        dismissKey,
        popupActive,
        requestable,
      }),
    })

    try {
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Er ging iets mis')
        setSaving(false)
        return
      }
      router.push('/admin/event')
    } catch {
      setError('Er ging iets mis bij het aanmaken')
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    color: '#053221',
    border: '1px solid rgba(200,169,110,0.4)',
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
            / Nieuw event
          </span>
        </div>
        <button
          onClick={() => router.push('/admin/event')}
          className="text-sm transition hover:opacity-70"
          style={{ color: 'rgba(232,237,233,0.6)' }}
        >
          ← Events
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="rounded-lg p-6" style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}>
          <h2 className="text-lg font-light mb-6 tracking-wide" style={{ color: '#053221' }}>
            Nieuw event aanmaken
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: '#4a6358' }}>
                Naam *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="Bv. GLTB Open 2025"
                required
                className="w-full px-4 py-3 text-sm focus:outline-none transition"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: '#4a6358' }}>
                Slug (URL-vriendelijke ID) *
              </label>
              <input
                type="text"
                value={slug}
                onChange={e => {
                  setSlugManual(true)
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                }}
                placeholder="bv. gltb-open-2025"
                required
                minLength={2}
                maxLength={60}
                className="w-full px-4 py-3 text-sm focus:outline-none transition font-mono tracking-widest"
                style={inputStyle}
              />
              <p className="text-xs mt-2" style={{ color: '#4a6358' }}>
                Automatisch gegenereerd uit naam, maar je kunt 'm aanpassen. Wordt ook gebruikt als dismiss-key voor de popup.
              </p>
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: '#4a6358' }}>
                Label bovenaan popup
              </label>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Live nu"
                className="w-full px-4 py-3 text-sm focus:outline-none transition"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: '#4a6358' }}>
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

            <div>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: '#4a6358' }}>
                Wachtwoord (optioneel)
              </label>
              <input
                type="text"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="bv. gltb2025"
                className="w-full px-4 py-3 text-sm focus:outline-none transition font-mono"
                style={inputStyle}
              />
              <p className="text-xs mt-2" style={{ color: '#4a6358' }}>
                Leeg laten als je het wachtwoord niet op de popup wilt tonen.
              </p>
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: '#4a6358' }}>
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

            <div className="grid grid-cols-2 gap-3">
              <label
                className="flex items-center gap-2 cursor-pointer px-3 py-3 rounded text-xs tracking-widest uppercase"
                style={{ border: '1px solid rgba(200,169,110,0.4)', color: '#053221' }}
              >
                <input
                  type="checkbox"
                  checked={popupActive}
                  onChange={e => setPopupActive(e.target.checked)}
                />
                Popup live
              </label>
              <label
                className="flex items-center gap-2 cursor-pointer px-3 py-3 rounded text-xs tracking-widest uppercase"
                style={{ border: '1px solid rgba(200,169,110,0.4)', color: '#053221' }}
              >
                <input
                  type="checkbox"
                  checked={requestable}
                  onChange={e => setRequestable(e.target.checked)}
                />
                Aanvraagbaar
              </label>
            </div>

            {error && (
              <p className="text-xs" style={{ color: '#c8a96e' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={saving || !name || !slug}
              className="py-3 text-xs font-medium tracking-widest uppercase transition disabled:opacity-40 mt-2"
              style={{ backgroundColor: '#053221', color: '#c8a96e' }}
            >
              {saving ? 'Aanmaken...' : 'Event aanmaken'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
