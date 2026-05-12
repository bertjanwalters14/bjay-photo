'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { Event } from '@/lib/types'

export default function AdminEventsListPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/events', { cache: 'no-store' })
    if (res.status === 401) {
      router.push('/admin/login')
      return
    }
    const data = await res.json()
    setEvents(data.events || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function toggle(slug: string, field: 'popupActive' | 'requestable', value: boolean) {
    setWorking(slug)
    await fetch(`/api/events/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    await load()
    setWorking(null)
  }

  async function remove(slug: string, name: string) {
    if (!confirm(`Event "${name}" volledig verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return
    setWorking(slug)
    await fetch(`/api/events/${slug}`, { method: 'DELETE' })
    await load()
    setWorking(null)
  }

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
            / Events
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => router.push('/admin/event/requests')}
            className="px-4 py-2 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
            style={{ border: '1px solid rgba(200,169,110,0.6)', color: '#c8a96e' }}
          >
            Aanvragen
          </button>
          <button
            onClick={() => router.push('/admin/event/new')}
            className="px-4 py-2 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
            style={{ backgroundColor: '#c8a96e', color: '#053221' }}
          >
            + Nieuw event
          </button>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="text-sm transition hover:opacity-70"
            style={{ color: 'rgba(232,237,233,0.6)' }}
          >
            ← Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-lg font-light mb-2 tracking-wide" style={{ color: '#053221' }}>
          Events ({events.length})
        </h2>
        <p className="text-xs mb-6" style={{ color: '#4a6358' }}>
          Slechts één event tegelijk kan als popup actief zijn. Aanvraagbaar mag voor meerdere.
        </p>

        {loading ? (
          <p style={{ color: '#4a6358' }}>Laden...</p>
        ) : events.length === 0 ? (
          <div className="rounded-lg p-8 text-center" style={{ backgroundColor: '#fff', border: '1px solid #c8a96e' }}>
            <p style={{ color: '#4a6358' }}>Nog geen events aangemaakt.</p>
            <button
              onClick={() => router.push('/admin/event/new')}
              className="mt-4 px-6 py-2 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
              style={{ backgroundColor: '#053221', color: '#c8a96e' }}
            >
              Eerste event aanmaken
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map(event => (
              <div
                key={event.slug}
                className="rounded-lg p-4"
                style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium" style={{ color: '#053221' }}>{event.name}</p>
                      {event.popupActive && (
                        <span
                          className="text-[10px] px-2 py-0.5 tracking-widest uppercase rounded-full"
                          style={{ backgroundColor: '#c8a96e', color: '#053221' }}
                        >
                          Popup live
                        </span>
                      )}
                      {event.requestable && (
                        <span
                          className="text-[10px] px-2 py-0.5 tracking-widest uppercase rounded-full"
                          style={{ backgroundColor: 'rgba(5,50,33,0.08)', color: '#053221', border: '1px solid rgba(5,50,33,0.2)' }}
                        >
                          Aanvraagbaar
                        </span>
                      )}
                      {!event.popupActive && !event.requestable && (
                        <span
                          className="text-[10px] px-2 py-0.5 tracking-widest uppercase rounded-full"
                          style={{ backgroundColor: 'rgba(74,99,88,0.15)', color: '#4a6358' }}
                        >
                          Archief
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1 font-mono break-all" style={{ color: '#4a6358' }}>
                      {event.slug}
                      {event.password && <span> · wachtwoord: <strong style={{ color: '#c8a96e' }}>{event.password}</strong></span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => router.push(`/admin/event/${event.slug}`)}
                      className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
                      style={{ backgroundColor: '#053221', color: '#c8a96e' }}
                    >
                      Bewerken
                    </button>
                    <button
                      onClick={() => remove(event.slug, event.name)}
                      disabled={working === event.slug}
                      className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80 disabled:opacity-40"
                      style={{ border: '1px solid rgba(74,99,88,0.4)', color: '#4a6358' }}
                    >
                      Verwijderen
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer" style={{ color: '#053221' }}>
                    <input
                      type="checkbox"
                      checked={event.popupActive}
                      disabled={working === event.slug}
                      onChange={e => toggle(event.slug, 'popupActive', e.target.checked)}
                    />
                    Popup live
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer" style={{ color: '#053221' }}>
                    <input
                      type="checkbox"
                      checked={event.requestable}
                      disabled={working === event.slug}
                      onChange={e => toggle(event.slug, 'requestable', e.target.checked)}
                    />
                    Aanvraagbaar
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
