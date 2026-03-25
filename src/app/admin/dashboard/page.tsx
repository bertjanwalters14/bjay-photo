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
    <main className="min-h-screen" style={{ backgroundColor: '#080f0c' }}>
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(200,169,110,0.15)' }}>
        <div className="flex items-center gap-3">
          <Image src="/logoBJAYv3.0-iconbackground.png" alt="Bjay.photo" width={32} height={32} />
          <span className="text-base font-bold tracking-widest uppercase"
            style={{ color: '#c8a96e', fontFamily: 'var(--font-jost), sans-serif' }}>
            Bjay.photo
          </span>
          <span className="text-xs tracking-widest uppercase ml-1"
            style={{ color: 'rgba(232,237,233,0.3)' }}>
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
            style={{ color: 'rgba(232,237,233,0.5)' }}>
            Uitloggen
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-xs tracking-widest uppercase mb-6"
          style={{ color: 'rgba(200,169,110,0.6)' }}>
          {clients.length} klant{clients.length !== 1 ? 'en' : ''}
        </p>

        {loading ? (
          <p className="text-sm" style={{ color: 'rgba(232,237,233,0.4)' }}>Laden...</p>
        ) : clients.length === 0 ? (
          <div className="py-16 text-center" style={{ border: '1px solid rgba(200,169,110,0.15)' }}>
            <p className="text-sm mb-6" style={{ color: 'rgba(232,237,233,0.4)' }}>
              Nog geen klanten aangemaakt.
            </p>
            <button
              onClick={() => router.push('/admin/clients/new')}
              className="px-6 py-2 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
              style={{ backgroundColor: '#c8a96e', color: '#053221' }}
            >
              Eerste klant aanmaken
            </button>
          </div>
        ) : (
          <div className="flex flex-col" style={{ border: '1px solid rgba(200,169,110,0.15)' }}>
            {clients.map((client, i) => (
              <div
                key={client.code}
                className="px-6 py-4 flex items-center justify-between cursor-pointer transition"
                style={{
                  borderBottom: i < clients.length - 1 ? '1px solid rgba(200,169,110,0.1)' : 'none',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(200,169,110,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                onClick={() => router.push(`/admin/clients/${client.code}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: 'rgba(200,169,110,0.15)', color: '#c8a96e' }}>
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#e8ede9' }}>{client.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(232,237,233,0.4)' }}>
                      {client.email || 'Geen e-mail'}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-6">
                  <p className="text-xs font-mono tracking-widest" style={{ color: '#c8a96e' }}>
                    {client.code}
                  </p>
                  <p className="text-xs hidden sm:block" style={{ color: 'rgba(232,237,233,0.3)' }}>
                    {new Date(client.createdAt).toLocaleDateString('nl-NL')}
                  </p>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="rgba(200,169,110,0.4)" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}