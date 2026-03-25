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
      <header className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#053221' }}>
        <div className="flex items-center gap-3">
          <Image src="/logoBJAYv3.0-iconbackground.png" alt="Bjay.photo" width={32} height={32} />
          <h1 className="text-xl font-bold tracking-widest uppercase"
            style={{ color: '#c8a96e', fontFamily: 'var(--font-jost), sans-serif' }}>
            Bjay.photo
          </h1>
          <span className="text-xs tracking-widest uppercase" style={{ color: 'rgba(200,169,110,0.5)' }}>
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
        <div className="rounded-lg p-6" style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}>
          <h2 className="text-lg font-light mb-6 tracking-wide" style={{ color: '#053221' }}>
            Klantgegevens
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: '#4a6358' }}>
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
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: '#4a6358' }}>
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
              <p className="text-xs" style={{ color: '#c8a96e' }}>{error}</p>
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