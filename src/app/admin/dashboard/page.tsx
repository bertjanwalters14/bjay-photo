'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Client } from '@/lib/types'

export default function AdminDashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingCode, setDeletingCode] = useState<string | null>(null)
  // Filter: 'active' = nog niet gearchiveerd, 'archived' = afgehandeld.
  const [filter, setFilter] = useState<'active' | 'archived'>('active')

  // Klanten gefilterd op de actieve tab.
  const visibleClients = useMemo(
    () =>
      clients
        .filter(c => (filter === 'archived' ? c.archivedAt : !c.archivedAt))
        .sort((a, b) => {
          // Op event-/shootdatum, nieuwste eerst; val terug op createdAt.
          const da = new Date(a.date || a.createdAt).getTime()
          const db = new Date(b.date || b.createdAt).getTime()
          return db - da
        }),
    [clients, filter],
  )
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

  async function handleDelete(client: Client) {
    const confirmed = window.confirm(
      `Weet je zeker dat je "${client.name}" wilt verwijderen?\n\n` +
        `Dit verwijdert PERMANENT:\n` +
        `• Alle foto's uit Cloudinary\n` +
        `• Likes, favorieten en feedback\n` +
        `• De klant-toegangscode (${client.code})\n\n` +
        `Dit kan niet ongedaan worden gemaakt.`
    )
    if (!confirmed) return

    setDeletingCode(client.code)
    try {
      const res = await fetch(`/api/clients/${client.code}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data?.error || 'Verwijderen mislukt')
        return
      }
      setClients(prev => prev.filter(c => c.code !== client.code))
    } catch (err) {
      console.error('Delete client error:', err)
      alert('Verwijderen mislukt — probeer opnieuw')
    } finally {
      setDeletingCode(null)
    }
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#e8ede9' }}>
      {/* Header */}
      <header className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ backgroundColor: '#053221' }}>
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
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => router.push('/admin/reviews')}
            className="px-4 py-2 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
            style={{ border: '1px solid rgba(200,169,110,0.6)', color: '#c8a96e' }}
          >
            Reviews
          </button>
          <button
            onClick={() => router.push('/admin/recent')}
            className="px-4 py-2 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
            style={{ border: '1px solid rgba(200,169,110,0.6)', color: '#c8a96e' }}
          >
            Recente momenten
          </button>
          <button
            onClick={() => router.push('/admin/event')}
            className="px-4 py-2 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
            style={{ border: '1px solid rgba(200,169,110,0.6)', color: '#c8a96e' }}
          >
            Event popup
          </button>
          <button
            onClick={() => router.push('/admin/orders')}
            className="px-4 py-2 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
            style={{ border: '1px solid rgba(200,169,110,0.6)', color: '#c8a96e' }}
          >
            Bestellingen
          </button>
          <button
            onClick={() => router.push('/admin/revenue')}
            className="px-4 py-2 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
            style={{ border: '1px solid rgba(200,169,110,0.6)', color: '#c8a96e' }}
          >
            Omzet
          </button>
          <button
            onClick={() => router.push('/admin/mail-preview')}
            className="px-4 py-2 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
            style={{ border: '1px solid rgba(200,169,110,0.6)', color: '#c8a96e' }}
          >
            Mail-preview
          </button>
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
        <h2 className="text-lg font-light mb-3 tracking-wide" style={{ color: '#053221' }}>
          Klanten ({clients.length})
        </h2>

        {/* Filter-chips: actief vs afgehandeld (gearchiveerd) */}
        {!loading && clients.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {(['active', 'archived'] as const).map(key => {
              const count = clients.filter(c =>
                key === 'archived' ? c.archivedAt : !c.archivedAt,
              ).length
              const label = key === 'active' ? 'Actief' : 'Afgehandeld'
              const isActive = filter === key
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className="px-3 py-1.5 text-xs tracking-widest uppercase transition"
                  style={{
                    backgroundColor: isActive ? '#053221' : '#fff',
                    color: isActive ? '#c8a96e' : '#053221',
                    border: '1px solid rgba(200,169,110,0.4)',
                    borderRadius: '999px',
                  }}
                >
                  {label} ({count})
                </button>
              )
            })}
          </div>
        )}

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
        ) : visibleClients.length === 0 ? (
          <div className="rounded-lg p-8 text-center" style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}>
            <p style={{ color: '#4a6358' }}>
              {filter === 'archived'
                ? 'Nog geen afgehandelde klanten. Archiveer klanten via hun detail-pagina.'
                : 'Geen actieve klanten.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleClients.map(client => (
              <div
                key={client.code}
                className="rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
              >
                {/* Avatar + info */}
                <div className="flex items-center gap-3 sm:gap-4 cursor-pointer flex-1 min-w-0"
                  onClick={() => router.push(`/admin/clients/${client.code}`)}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: '#053221', color: '#c8a96e' }}>
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium break-words" style={{ color: '#053221' }}>{client.name}</p>
                      <span
                        className="text-[10px] px-2 py-0.5 tracking-widest uppercase rounded-full whitespace-nowrap"
                        style={{
                          backgroundColor:
                            (client.type ?? 'personal') === 'event'
                              ? 'rgba(200,169,110,0.15)'
                              : 'rgba(5,50,33,0.08)',
                          color:
                            (client.type ?? 'personal') === 'event' ? '#c8a96e' : '#053221',
                          border:
                            (client.type ?? 'personal') === 'event'
                              ? '1px solid rgba(200,169,110,0.4)'
                              : '1px solid rgba(5,50,33,0.2)',
                        }}
                      >
                        {(client.type ?? 'personal') === 'event' ? 'Event' : 'Personal'}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 break-words" style={{ color: '#4a6358' }}>
                      {client.email || 'Geen e-mail'}
                    </p>
                    {client.date && (
                      <p className="text-xs mt-0.5" style={{ color: '#4a6358' }}>
                        {new Date(client.date).toLocaleDateString('nl-NL')}
                      </p>
                    )}
                    <p className="text-xs mt-1 font-mono tracking-widest sm:hidden" style={{ color: '#c8a96e' }}>
                      {client.code}
                    </p>
                  </div>
                </div>

                {/* Rechts */}
                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                  <p className="text-sm font-mono tracking-widest hidden sm:block" style={{ color: '#c8a96e' }}>
                    {client.code}
                  </p>
                  <button
                    onClick={() => window.open(`/gallery/${client.code}`, '_blank')}
                    className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
                    style={{ border: '1px solid #c8a96e', color: '#c8a96e' }}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => router.push(`/admin/clients/${client.code}`)}
                    className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
                    style={{ backgroundColor: '#053221', color: '#c8a96e' }}
                  >
                    Beheer
                  </button>
                  <button
                    onClick={() => handleDelete(client)}
                    disabled={deletingCode === client.code}
                    title="Klant verwijderen"
                    aria-label={`Klant ${client.name} verwijderen`}
                    className="flex items-center justify-center w-8 h-8 rounded transition hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ color: '#b54545' }}
                  >
                    {deletingCode === client.code ? (
                      <span className="text-xs">...</span>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                        <path d="M10 11v6"></path>
                        <path d="M14 11v6"></path>
                        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    )}
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
