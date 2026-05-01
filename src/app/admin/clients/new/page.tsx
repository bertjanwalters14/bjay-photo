'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { PortalType } from '@/lib/types'

export default function NewClientPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [type, setType] = useState<PortalType>('personal')
  const [customCode, setCustomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        type,
        customCode: customCode.trim() || undefined,
      }),
    })

    try {
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Er ging iets mis')
        setLoading(false)
        return
      }
      router.push(`/admin/clients/${data.client.code}`)
    } catch {
      setError('Er ging iets mis bij het aanmaken')
      setLoading(false)
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
            / Nieuwe klant
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

      <div className="max-w-md mx-auto px-4 py-8">
        <div
          className="rounded-lg p-6"
          style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
        >
          <h2
            className="text-lg font-light mb-6 tracking-wide"
            style={{ color: '#053221' }}
          >
            Klantgegevens
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Type-keuze */}
            <div>
              <label
                className="block text-xs tracking-widest uppercase mb-2"
                style={{ color: '#4a6358' }}
              >
                Type portaal *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('personal')}
                  className="py-3 text-xs font-medium tracking-widest uppercase transition"
                  style={{
                    backgroundColor: type === 'personal' ? '#053221' : '#fff',
                    color: type === 'personal' ? '#c8a96e' : '#053221',
                    border: '1px solid rgba(200,169,110,0.4)',
                  }}
                >
                  👤 Persoonlijk
                </button>
                <button
                  type="button"
                  onClick={() => setType('event')}
                  className="py-3 text-xs font-medium tracking-widest uppercase transition"
                  style={{
                    backgroundColor: type === 'event' ? '#053221' : '#fff',
                    color: type === 'event' ? '#c8a96e' : '#053221',
                    border: '1px solid rgba(200,169,110,0.4)',
                  }}
                >
                  🎪 Evenement
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: '#4a6358' }}>
                {type === 'personal'
                  ? 'Eén klant met favorieten en feedback per foto.'
                  : 'Meerdere bezoekers; liken met naam i.p.v. favorieten.'}
              </p>
            </div>

            {/* Naam */}
            <div>
              <label
                className="block text-xs tracking-widest uppercase mb-2"
                style={{ color: '#4a6358' }}
              >
                {type === 'event' ? 'Evenementnaam' : 'Naam'} *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={type === 'event' ? 'Bv. Bruiloft Jan & Lisa' : 'Naam klant'}
                required
                className="w-full px-4 py-3 text-sm focus:outline-none transition"
                style={inputStyle}
              />
            </div>

            {/* E-mail */}
            <div>
              <label
                className="block text-xs tracking-widest uppercase mb-2"
                style={{ color: '#4a6358' }}
              >
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@voorbeeld.nl"
                className="w-full px-4 py-3 text-sm focus:outline-none transition"
                style={inputStyle}
              />
            </div>

            {/* Custom code (optioneel) */}
            <div>
              <label
                className="block text-xs tracking-widest uppercase mb-2"
                style={{ color: '#4a6358' }}
              >
                Eigen code (optioneel)
              </label>
              <input
                type="text"
                value={customCode}
                onChange={e =>
                  setCustomCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                }
                placeholder="bv. jan-lisa-2026"
                minLength={4}
                maxLength={32}
                className="w-full px-4 py-3 text-sm focus:outline-none transition font-mono tracking-widest"
                style={inputStyle}
              />
              <p className="text-xs mt-2" style={{ color: '#4a6358' }}>
                Leeg laten = automatisch gegenereerd. Alleen kleine letters, cijfers en streepjes (4–32 tekens).
              </p>
            </div>

            {error && (
              <p className="text-xs" style={{ color: '#c8a96e' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !name}
              className="py-3 text-xs font-medium tracking-widest uppercase transition disabled:opacity-40 mt-2"
              style={{ backgroundColor: '#053221', color: '#c8a96e' }}
            >
              {loading ? 'Aanmaken...' : 'Klant aanmaken'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
