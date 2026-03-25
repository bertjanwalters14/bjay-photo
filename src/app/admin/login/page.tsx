'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    router.push('/admin/dashboard')
  }

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#053221' }}>
      <div className="w-full max-w-sm px-6">
        <div className="flex justify-center mb-6">
          <Image src="/logoBJAYv3.0-iconbackground.png" alt="Bjay.photo" width={64} height={64} />
        </div>
        <h1
          className="text-3xl font-bold text-center mb-1 tracking-widest uppercase"
          style={{ color: '#c8a96e', fontFamily: 'var(--font-jost), sans-serif' }}
        >
          Admin
        </h1>
        <p className="text-center text-xs tracking-widest uppercase mb-8"
          style={{ color: 'rgba(232,237,233,0.5)' }}>
          Bjay.photo beheer
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Wachtwoord"
            className="px-4 py-3 text-sm focus:outline-none transition"
            style={{
              backgroundColor: '#032a1c',
              color: '#e8ede9',
              border: '1px solid rgba(200,169,110,0.4)',
            }}
          />
          {error && (
            <p className="text-xs text-center" style={{ color: '#c8a96e' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="py-3 text-sm font-medium tracking-widest uppercase transition disabled:opacity-30"
            style={{ backgroundColor: '#c8a96e', color: '#053221' }}
          >
            {loading ? 'Laden...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </main>
  )
}