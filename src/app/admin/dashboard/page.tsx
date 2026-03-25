'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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
        <div className="flex items-center gap-3">
          <Image src="/logoBJAYv3.0-iconbackground.png" alt="Bjay.photo" width={32} height={32} />
          <h1 className="text-xl font-bold tracking-widest uppercase"
            style={{ color: '#c8a96e', fontFamily: 'var(--font-jost), sans-serif' }}>
            Bjay.photo
          </h1>
          <span className="text-xs tracking-widest uppercase" style={{ color: 'rgba(200,169,110,0.5)' }}>
            / Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/clients/new')}
            className="px-4 py-2 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
            style={{ backgroundColor: '#c8a96e', color: '#053221' }}
          >
            + Nieuwe klant
          </button>
          <button onClick={handleLogout} className="text-sm transition hover:opacity-70"
            style={{ color: 'rgba(232,237,233,0.6)' }}>
            Uitloggen
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-lg font-light mb-6 tracking-wide" style={{ color: '#053221' }}>
          Klanten ({clients.length})
        </h2>

        {loading ? (
          <p style={{ color: '#4a6358' }}>Laden...</p>
        ) : clients.length === 0 ? (
          <div className="rounded-lg p-8 text-center" style={{ backgroundColor: '#fff', border: '1px solid #c8a96e' }}>
            <p style={{ color: '#4a6358' }}>Nog geen klanten aangemaakt.</p>
            <button
              onClick={() => router.push('/admin/clients/new')}
              className="mt-4 px-6 py-2 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
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
                className="rounded-lg p-4 flex items-center justify-between"
                style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
              >
                {/* Avatar + info */}
                <div className="flex items-center gap-4 cursor-pointer flex-1"
                  onClick={() => router.push(`/admin/clients/${client.code}`)}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: '#053221', color: '#c8a96e' }}>
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: '#053221' }}>{client.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#4a6358' }}>
                      {client.email || 'Geen e-mail'}
                    </p>
                  </div>
                </div>

                {/* Rechts */}
                <div className="flex items-center gap-4">
                  <p className="text-sm font-mono tracking-widest hidden sm:block" style={{ color: '#c8a96e' }}>
                    {client.code}
                  </p>
                  {/* Preview knop */}
                  <button
                    onClick={() => window.open(`/gallery/${client.code}`, '_blank')}
                    className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
                    style={{ border: '1px solid #c8a96e', color: '#c8a96e' }}
                  >
                    Preview
                  </button>
                  {/* Beheer knop */}
                  <button
                    onClick={() => router.push(`/admin/clients/${client.code}`)}
                    className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
                    style={{ backgroundColor: '#053221', color: '#c8a96e' }}
                  >
                    Beheer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}