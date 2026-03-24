'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
      <header className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#053221' }}>
        <h1 className="text-2xl font-light tracking-widest uppercase" style={{ color: '#c8a96e' }}>
          Nieuwe klant
        </h1>
        <button
          onClick={() => router.push('/admin/dashboard')}
          className="text-sm transition hover:opacity-70"
          style={{ color: '#e8ede9' }}
        >
          ← Terug
        </button>
      </header>

      <div className="max-w-md mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: '#4a6358' }}>Naam *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Naam klant"
              required
              className="w-full rounded px-4 py-3 focus:outline-none transition"
              style={{
                backgroundColor: '#fff',
                color: '#053221',
                border: '1px solid #c8a96e',
              }}
            />
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: '#4a6358' }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@voorbeeld.nl"
              className="w-full rounded px-4 py-3 focus:outline-none transition"
              style={{
                backgroundColor: '#fff',
                color: '#053221',
                border: '1px solid #c8a96e',
              }}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: '#c8a96e' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name}
            className="py-3 rounded font-medium transition disabled:opacity-40"
            style={{ backgroundColor: '#053221', color: '#c8a96e' }}
          >
            {loading ? 'Aanmaken...' : 'Klant aanmaken'}
          </button>
        </form>
      </div>
    </main>
  )
}