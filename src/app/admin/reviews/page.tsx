'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { Client } from '@/lib/types'

type ReviewState = 'not-delivered' | 'awaiting' | 'sent' | 'received'

function getReviewState(c: Client): ReviewState {
  if (c.reviewReceived) return 'received'
  if (c.reviewRequestedAt) return 'sent'
  if (c.deliveredAt) return 'awaiting'
  return 'not-delivered'
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000))
}

export default function AdminReviewsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/clients', { cache: 'no-store' })
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      const personalClients: Client[] = (data.clients || []).filter(
        (c: Client) => (c.type ?? 'personal') === 'personal' && c.email,
      )
      setClients(personalClients)
      setLoading(false)
    }
    load()
  }, [router])

  // Groepeer per status
  const received = clients.filter(c => getReviewState(c) === 'received')
  const sent = clients.filter(c => getReviewState(c) === 'sent')
  const awaiting = clients.filter(c => getReviewState(c) === 'awaiting')
  const notDelivered = clients.filter(c => getReviewState(c) === 'not-delivered')

  // Klanten die nu daadwerkelijk zouden moeten triggeren (deliveredAt > 3 dagen)
  const readyToTrigger = awaiting.filter(
    c => c.deliveredAt && daysSince(c.deliveredAt) >= 3
  )

  async function runCronNow() {
    if (!confirm(
      `Cron handmatig uitvoeren?\n\n${readyToTrigger.length} klant(en) staan klaar voor een review-mail.`
    )) return

    setRunning(true)
    try {
      const res = await fetch('/api/cron/review-requests', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setLastRun(
          `${new Date().toLocaleTimeString('nl-NL')} - ${data.sent || 0} verstuurd` +
            (data.failed ? `, ${data.failed} mislukt` : '')
        )
        // Klanten herladen om bijgewerkte reviewRequestedAt te zien
        const refreshed = await fetch('/api/clients', { cache: 'no-store' })
        if (refreshed.ok) {
          const d = await refreshed.json()
          const personalClients: Client[] = (d.clients || []).filter(
            (c: Client) => (c.type ?? 'personal') === 'personal' && c.email,
          )
          setClients(personalClients)
        }
      } else {
        setLastRun(`fout: ${data?.error || res.statusText}`)
      }
    } catch (err) {
      console.error('Cron trigger fout:', err)
      setLastRun('netwerkfout')
    } finally {
      setRunning(false)
    }
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
          <span className="text-xs tracking-widest uppercase" style={{ color: 'rgba(200,169,110,0.5)' }}>
            / Reviews
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-lg font-light mb-2 tracking-wide" style={{ color: '#053221' }}>
          Review-flow overzicht
        </h2>
        <p className="text-xs mb-6 leading-relaxed" style={{ color: '#4a6358' }}>
          Markeer een klant als opgeleverd in z&apos;n detailpagina. 3 dagen later wordt
          automatisch een review-vraag verstuurd. Vink &apos;Review ontvangen&apos; aan zodra
          je de Google-review ziet.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatCard label="Ontvangen" value={received.length} color="#c8a96e" />
          <StatCard label="Mail verzonden" value={sent.length} color="#053221" />
          <StatCard label="Wacht op cron" value={awaiting.length} color="#4a6358" />
          <StatCard label="Nog niet opgeleverd" value={notDelivered.length} color="#4a6358" muted />
        </div>

        {/* Handmatige trigger — voor als de cron hangt of als je niet wilt wachten */}
        {readyToTrigger.length > 0 && (
          <div
            className="rounded-lg p-4 mb-8 flex flex-col sm:flex-row sm:items-center gap-3"
            style={{
              backgroundColor: '#fff',
              border: '1px solid rgba(200,169,110,0.4)',
            }}
          >
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#053221' }}>
                {readyToTrigger.length} klant{readyToTrigger.length !== 1 ? 'en' : ''} klaar voor review-mail
              </p>
              <p className="text-xs mt-1" style={{ color: '#4a6358' }}>
                Trigger de cron handmatig als de dagelijkse run nog niet is geweest.
              </p>
              {lastRun && (
                <p className="text-xs mt-1" style={{ color: '#c8a96e' }}>
                  Laatste run: {lastRun}
                </p>
              )}
            </div>
            <button
              onClick={runCronNow}
              disabled={running}
              className="px-4 py-2 text-xs font-medium tracking-widest uppercase transition hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#053221', color: '#c8a96e' }}
            >
              {running ? 'Bezig...' : 'Trigger nu'}
            </button>
          </div>
        )}

        {loading ? (
          <p style={{ color: '#4a6358' }}>Laden...</p>
        ) : clients.length === 0 ? (
          <div className="rounded-lg p-8 text-center" style={{ backgroundColor: '#fff', border: '1px solid #c8a96e' }}>
            <p style={{ color: '#4a6358' }}>Nog geen personal-klanten met e-mailadres.</p>
          </div>
        ) : (
          <>
            <Section title={`★ Review ontvangen (${received.length})`} clients={received} router={router} />
            <Section title={`Mail verzonden (${sent.length})`} clients={sent} router={router} />
            <Section title={`Wacht op review-mail (${awaiting.length})`} clients={awaiting} router={router} />
            <Section title={`Nog niet opgeleverd (${notDelivered.length})`} clients={notDelivered} router={router} dim />
          </>
        )}
      </div>
    </main>
  )
}

function StatCard({ label, value, color, muted }: { label: string; value: number; color: string; muted?: boolean }) {
  return (
    <div
      className="rounded-lg p-3 text-center"
      style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)', opacity: muted ? 0.7 : 1 }}
    >
      <p className="text-2xl font-light" style={{ color }}>{value}</p>
      <p className="text-[10px] tracking-widest uppercase mt-1" style={{ color: '#4a6358' }}>{label}</p>
    </div>
  )
}

function Section({
  title,
  clients,
  router,
  dim,
}: {
  title: string
  clients: Client[]
  router: ReturnType<typeof useRouter>
  dim?: boolean
}) {
  if (clients.length === 0) return null
  return (
    <div className="mb-6" style={{ opacity: dim ? 0.6 : 1 }}>
      <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#c8a96e' }}>
        {title}
      </p>
      <div className="flex flex-col gap-2">
        {clients.map(c => {
          const state = getReviewState(c)
          return (
            <div
              key={c.code}
              className="rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
            >
              <div className="min-w-0">
                <p className="font-medium break-words" style={{ color: '#053221' }}>{c.name}</p>
                <p className="text-xs mt-0.5" style={{ color: '#4a6358' }}>
                  {c.deliveredAt && `Opgeleverd ${daysSince(c.deliveredAt)}d geleden`}
                  {c.reviewRequestedAt && ` · Mail ${daysSince(c.reviewRequestedAt)}d geleden`}
                  {state === 'received' && ' · Review ontvangen ★'}
                  {state === 'not-delivered' && 'Aangemaakt ' + daysSince(c.createdAt) + 'd geleden'}
                </p>
              </div>
              <button
                onClick={() => router.push(`/admin/clients/${c.code}`)}
                className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
                style={{ backgroundColor: '#053221', color: '#c8a96e' }}
              >
                Beheer
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
