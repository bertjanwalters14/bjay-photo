'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function NewClientPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
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
      body: JSON.stringify({ name, email }),
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
            / Nieuwe klant
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

      <div className="max-w-md mx-auto px-6 py-10">
        <p className="text-xs tracking-widest uppercase mb-8"
          style={{ color: '#4a6358' }}>
          Klantgegevens
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs tracking-widest uppercase mb-2"
              style={{ color: '#4a6358' }}>
              Naam *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Naam klant"
              required
              className="w-full px-4 py-3 text-sm focus:outline-none transition"
              style={{
                backgroundColor: '#fff',
                color: '#053221',
                border: '1px solid rgba(200,169,110,0.4)',
              }}
            />
          </div>

          <div>
            <label className="block text-xs tracking-widest uppercase mb-2"
              style={{ color: '#4a6358' }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@voorbeeld.nl"
              className="w-full px-4 py-3 text-sm focus:outline-none transition"
              style={{
                backgroundColor: '#fff',
                color: '#053221',
                border: '1px solid rgba(200,169,110,0.4)',
              }}
            />
          </div>

          {error && (
            <p className="text-xs tracking-wide" style={{ color: '#c8a96e' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name}
            className="py-3 text-xs font-medium tracking-widest uppercase transition disabled:opacity-30 mt-2"
            style={{ backgroundColor: '#c8a96e', color: '#053221' }}
          >
            {loading ? 'Aanmaken...' : 'Klant aanmaken'}
          </button>
        </form>
      </div>
    </main>
  )
}