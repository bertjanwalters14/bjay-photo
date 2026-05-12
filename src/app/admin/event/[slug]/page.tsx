'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import type { Event } from '@/lib/types'

export default function EditEventPage() {
  const router = useRouter()
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [label, setLabel] = useState('Live nu')
  const [description, setDescription] = useState('')
  const [password, setPassword] = useState('')
  const [loginUrl, setLoginUrl] = useState('')
  const [dismissKey, setDismissKey] = useState('')
  const [popupActive, setPopupActive] = useState(false)
  const [requestable, setRequestable] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/events/${slug}`, { cache: 'no-store' })
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      if (res.status === 404) {
        router.push('/admin/event')
        return
      }
      const data = await res.json()
      const event = data.event as Event
      setName(event.name)
      setLabel(event.label)
      setDescription(event.description)
      setPassword(event.password)
      setLoginUrl(event.loginUrl)
      setDismissKey(event.dismissKey)
      setPopupActive(event.popupActive)
      setRequestable(event.requestable)
      setLoading(false)
    }
    if (slug) load()
  }, [slug, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    const res = await fetch(`/api/events/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
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
      } else {
        setMessage('Opgeslagen')
      }
    } catch {
      setError('Er ging iets mis bij het opslaan')
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Event "${name}" volledig verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return
    setSaving(true)
    await fetch(`/api/events/${slug}`, { method: 'DELETE' })
    router.push('/admin/event')
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
            / Event bewerken
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
        {loading ? (
          <p style={{ color: '#4a6358' }}>Laden...</p>
        ) : (
          <div className="rounded-lg p-6" style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}>
            <h2 className="text-lg font-light mb-1 tracking-wide" style={{ color: '#053221' }}>
              {name}
            </h2>
            <p className="text-xs mb-6 font-mono" style={{ color: '#4a6358' }}>
              {slug}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: '#4a6358' }}>
                  Naam *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 text-sm focus:outline-none transition"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: '#4a6358' }}>
                  Label bovenaan popup
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
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
                  className="w-full px-4 py-3 text-sm focus:outline-none transition font-mono"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: '#4a6358' }}>
                  Login-URL
                </label>
                <input
                  type="url"
                  value={loginUrl}
                  onChange={e => setLoginUrl(e.target.value)}
                  className="w-full px-4 py-3 text-sm focus:outline-none transition font-mono"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: '#4a6358' }}>
                  Dismiss-key
                </label>
                <input
                  type="text"
                  value={dismissKey}
                  onChange={e => setDismissKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full px-4 py-3 text-sm focus:outline-none transition font-mono tracking-widest"
                  style={inputStyle}
                />
                <p className="text-xs mt-2" style={{ color: '#4a6358' }}>
                  Wijzig deze key als je een &quot;nieuw&quot; event wilt waarvoor bezoekers de popup opnieuw zien.
                </p>
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

              {message && (
                <p
                  className="text-xs px-3 py-2"
                  style={{ color: '#053221', backgroundColor: 'rgba(200,169,110,0.2)' }}
                >
                  {message}
                </p>
              )}
              {error && (
                <p className="text-xs" style={{ color: '#c8a96e' }}>{error}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mt-2">
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
                  onClick={handleDelete}
                  disabled={saving}
                  className="sm:px-6 py-3 text-xs font-medium tracking-widest uppercase transition disabled:opacity-40"
                  style={{ backgroundColor: '#fff', color: '#4a6358', border: '1px solid rgba(74,99,88,0.4)' }}
                >
                  Verwijderen
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}
