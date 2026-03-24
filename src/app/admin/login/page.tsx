'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

        <h1
          className="text-4xl font-light text-center mb-2 tracking-widest uppercase"
          style={{ color: '#c8a96e' }}
        >
          Admin
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: '#e8ede9' }}>
          Bjay.photo beheer
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Wachtwoord"
            className="rounded px-4 py-3 focus:outline-none transition"
            style={{
              backgroundColor: '#032a1c',
              color: '#e8ede9',
              border: '1px solid #c8a96e',
            }}
          />

          {error && (
            <p className="text-sm text-center" style={{ color: '#c8a96e' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="font-medium py-3 rounded transition disabled:opacity-40"
            style={{
              backgroundColor: '#c8a96e',
              color: '#053221',
            }}
          >
            {loading ? 'Laden...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </main>
  )
}