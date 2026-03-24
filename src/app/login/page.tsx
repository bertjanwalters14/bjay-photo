'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    router.push(`/gallery/${code.toLowerCase()}`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#053221' }}>
      <div className="w-full max-w-sm px-6">

        <div className="flex justify-center mb-6">
          <Image
            src="/logoBJAYv3.0-iconbackground.png"
            alt="Bjay.photo logo"
            width={100}
            height={100}
            priority
          />
        </div>

        <h1
          className="text-4xl font-bold text-center mb-2 tracking-widest uppercase"
          style={{ color: '#c8a96e', fontFamily: 'var(--font-jost), sans-serif' }}
        >
          Bjay.photo
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: '#e8ede9' }}>
          Voer je persoonlijke code in
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Jouw code"
            className="rounded px-4 py-3 text-center tracking-widest uppercase focus:outline-none transition"
            style={{
              backgroundColor: '#032a1c',
              color: '#e8ede9',
              border: '1px solid #c8a96e',
            }}
            autoComplete="off"
          />

          {error && (
            <p className="text-sm text-center" style={{ color: '#c8a96e' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !code}
            className="font-medium py-3 rounded transition disabled:opacity-40"
            style={{
              backgroundColor: '#c8a96e',
              color: '#053221',
            }}
          >
            {loading ? 'Laden...' : "Bekijk mijn foto's"}
          </button>
        </form>
      </div>
    </main>
  )
}