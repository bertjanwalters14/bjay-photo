'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { EventRequest } from '@/lib/types'

export default function AdminRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<EventRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/events/requests', { cache: 'no-store' })
    if (res.status === 401) {
      router.push('/admin/login')
      return
    }
    const data = await res.json()
    setRequests(data.requests || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function toggleHandled(id: string, handled: boolean) {
    setWorking(id)
    await fetch(`/api/events/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handled }),
    })
    await load()
    setWorking(null)
  }

  async function remove(id: string) {
    if (!confirm('Aanvraag verwijderen?')) return
    setWorking(id)
    await fetch(`/api/events/requests/${id}`, { method: 'DELETE' })
    await load()
    setWorking(null)
  }

  const pending = requests.filter(r => !r.handled)
  const done = requests.filter(r => r.handled)

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#e8ede9' }}>
      <header
        className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={{ backgroundColor: '#053221' }}
      >
        <div className="flex items-center gap-3">
          <Image src="/logoBJAYv3.0-iconbackground.png" alt="Bjay.photo" width={32} height={32} />
          <h1
            className="text-xl font-bold tracking-widest uppercase"
            style={{ color: '#c8a96e', fontFamily: 'var(--font-jost), sans-serif' }}
          >
            Bjay.photo
          </h1>
          <span
            className="text-xs tracking-widest uppercase"
            style={{ color: 'rgba(200,169,110,0.5)' }}
          >
            / Aanvragen
          </span>
        </div>
        <button
          onClick={() => router.push('/admin/event')}
          className="text-sm transition hover:opacity-70"
          style={{ color: 'rgba(232,237,233,0.6)' }}
        >
          ← Events
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-lg font-light mb-2 tracking-wide" style={{ color: '#053221' }}>
          Wachtwoord-aanvragen
        </h2>
        <p className="text-xs mb-6" style={{ color: '#4a6358' }}>
          Bezoekers die het wachtwoord voor een event hebben aangevraagd. Markeer ze als afgehandeld zodra je gereageerd hebt.
        </p>

        {loading ? (
          <p style={{ color: '#4a6358' }}>Laden...</p>
        ) : requests.length === 0 ? (
          <div className="rounded-lg p-8 text-center" style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}>
            <p style={{ color: '#4a6358' }}>Nog geen aanvragen binnen.</p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="mb-8">
                <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#c8a96e' }}>
                  Openstaand ({pending.length})
                </p>
                <div className="flex flex-col gap-3">
                  {pending.map(r => (
                    <RequestRow key={r.id} req={r} working={working} onToggle={toggleHandled} onDelete={remove} />
                  ))}
                </div>
              </div>
            )}

            {done.length > 0 && (
              <div>
                <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#4a6358' }}>
                  Afgehandeld ({done.length})
                </p>
                <div className="flex flex-col gap-3">
                  {done.map(r => (
                    <RequestRow key={r.id} req={r} working={working} onToggle={toggleHandled} onDelete={remove} dim />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

function RequestRow({
  req,
  working,
  onToggle,
  onDelete,
  dim,
}: {
  req: EventRequest
  working: string | null
  onToggle: (id: string, handled: boolean) => void
  onDelete: (id: string) => void
  dim?: boolean
}) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: '#fff',
        border: '1px solid rgba(200,169,110,0.3)',
        opacity: dim ? 0.6 : 1,
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium" style={{ color: '#053221' }}>
            {req.name} <span style={{ color: '#4a6358', fontWeight: 400 }}>· {req.eventName}</span>
          </p>
          <p className="text-xs mt-1 break-words" style={{ color: '#4a6358' }}>
            <a href={`mailto:${req.email}`} style={{ color: '#c8a96e', wordBreak: 'break-all' }}>{req.email}</a>
            {req.phone && <span> · {req.phone}</span>}
          </p>
          {(req.context || req.message) && (
            <div className="mt-2 text-xs break-words" style={{ color: '#053221' }}>
              {req.context && <p><strong>Context:</strong> {req.context}</p>}
              {req.message && <p><strong>Bericht:</strong> {req.message}</p>}
            </div>
          )}
          <p className="text-[10px] mt-2 tracking-widest uppercase" style={{ color: '#4a6358' }}>
            {new Date(req.createdAt).toLocaleString('nl-NL')}
          </p>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => onToggle(req.id, !req.handled)}
            disabled={working === req.id}
            className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80 disabled:opacity-40"
            style={
              req.handled
                ? { border: '1px solid rgba(74,99,88,0.4)', color: '#4a6358' }
                : { backgroundColor: '#053221', color: '#c8a96e' }
            }
          >
            {req.handled ? 'Heropenen' : 'Markeer als afgehandeld'}
          </button>
          <button
            onClick={() => onDelete(req.id)}
            disabled={working === req.id}
            className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80 disabled:opacity-40"
            style={{ border: '1px solid rgba(74,99,88,0.4)', color: '#4a6358' }}
          >
            Verwijder
          </button>
        </div>
      </div>
    </div>
  )
}
