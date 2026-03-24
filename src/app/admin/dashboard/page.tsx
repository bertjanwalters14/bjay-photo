'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Client } from '@/lib/types'

export default function AdminDashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/clients')
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      try {
        const data = await res.json()
        setClients(data.clients || [])
      } catch {
        setClients([])
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function handleLogout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' }),
    })
    router.push('/admin/login')
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#e8ede9' }}>
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#053221' }}>
        <h1 className="text-2xl font-light tracking-widest uppercase" style={{ color: '#c8a96e' }}>
          Bjay.photo — Admin
        </h1>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => router.push('/admin/clients/new')}
            className="px-4 py-2 rounded text-sm font-medium transition hover:opacity-80"
            style={{ backgroundColor: '#c8a96e', color: '#053221' }}
          >
            + Nieuwe klant
          </button>
          <button
            onClick={handleLogout}
            className="text-sm transition hover:opacity-70"
            style={{ color: '#e8ede9' }}
          >
            Uitloggen
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-light mb-6" style={{ color: '#053221' }}>
          Klanten
        </h2>

        {loading ? (
          <p style={{ color: '#4a6358' }}>Laden...</p>
        ) : clients.length === 0 ? (
          <div
            className="rounded-lg p-8 text-center"
            style={{ backgroundColor: '#fff', border: '1px solid #c8a96e' }}
          >
            <p style={{ color: '#4a6358' }}>Nog geen klanten aangemaakt.</p>
            <button
              onClick={() => router.push('/admin/clients/new')}
              className="mt-4 px-6 py-2 rounded font-medium transition hover:opacity-80"
              style={{ backgroundColor: '#053221', color: '#c8a96e' }}
            >
              Eerste klant aanmaken
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {clients.map(client => (
              <div
                key={client.code}
                className="rounded-lg p-4 flex items-center justify-between cursor-pointer hover:opacity-90 transition"
                style={{ backgroundColor: '#fff', border: '1px solid #c8a96e' }}
                onClick={() => router.push(`/admin/clients/${client.code}`)}
              >
                <div>
                  <p className="font-medium" style={{ color: '#053221' }}>{client.name}</p>
                  <p className="text-sm" style={{ color: '#4a6358' }}>{client.email || 'Geen e-mail'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono tracking-widest" style={{ color: '#c8a96e' }}>
                    {client.code}
                  </p>
                  <p className="text-xs" style={{ color: '#4a6358' }}>
                    {new Date(client.createdAt).toLocaleDateString('nl-NL')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}