'use client'

import { useState } from 'react'
import { formatPrice } from '@/lib/format'
import type { Client } from '@/lib/types'

const VOORWAARDEN_URL = 'https://bjay.photo/voorwaarden'

function dateLabel(date?: string | null): string | null {
  if (!date) return null
  const d = new Date(date + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Akkoord-scherm: toont de boekingssamenvatting + link naar de algemene
// voorwaarden + een "Ik ga akkoord"-knop. onAccept verzorgt het vastleggen
// (POST). Als de klant al akkoord is, toont 'ie de bevestiging.
export default function TermsAccept({
  client,
  onAccept,
}: {
  client: Client
  onAccept: () => Promise<void>
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const price = formatPrice(client.price)
  const dl = dateLabel(client.date)
  const accepted = Boolean(client.termsAcceptedAt)

  async function accept() {
    setSubmitting(true)
    setError('')
    try {
      await onAccept()
    } catch {
      setError('Er ging iets mis. Probeer het zo nog eens.')
      setSubmitting(false)
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ backgroundColor: '#e8ede9' }}
    >
      <div
        className="w-full max-w-md rounded-lg p-7"
        style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
      >
        {accepted ? (
          <div className="flex flex-col gap-3 text-center">
            <span className="text-3xl">✓</span>
            <h1 className="text-lg font-medium tracking-wide" style={{ color: '#053221' }}>
              Bedankt, je bent akkoord
            </h1>
            <p className="text-sm" style={{ color: '#4a6358' }}>
              Je akkoord op de algemene voorwaarden is geregistreerd op{' '}
              {new Date(client.termsAcceptedAt as string).toLocaleDateString('nl-NL')}.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <span
                className="text-xs tracking-widest uppercase"
                style={{ color: '#c8a96e' }}
              >
                Even bevestigen
              </span>
              <h1 className="text-lg font-medium tracking-wide mt-1" style={{ color: '#053221' }}>
                Hoi {client.contactName?.trim() || client.name.trim().split(/\s+/)[0]}, je boeking
              </h1>
            </div>

            <div
              className="rounded p-4 flex flex-col gap-1.5 text-sm"
              style={{ backgroundColor: '#e8ede9' }}
            >
              <div style={{ color: '#4a6358' }}>
                Shoot: <span style={{ color: '#053221' }}>{client.name}</span>
              </div>
              {dl && (
                <div style={{ color: '#4a6358' }}>
                  Datum: <span style={{ color: '#053221' }}>{dl}</span>
                </div>
              )}
              {price && (
                <div style={{ color: '#4a6358' }}>
                  Afgesproken bedrag: <span style={{ color: '#053221' }}>{price}</span>
                </div>
              )}
            </div>

            <p className="text-sm leading-relaxed" style={{ color: '#4a6358' }}>
              Voordat we beginnen vraag ik je mn{' '}
              <a
                href={VOORWAARDEN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: '#053221' }}
              >
                algemene voorwaarden
              </a>{' '}
              door te lezen en akkoord te geven.
            </p>

            {error && (
              <p className="text-sm" style={{ color: '#b54545' }}>
                {error}
              </p>
            )}

            <button
              onClick={accept}
              disabled={submitting}
              className="py-3 text-xs font-medium tracking-widest uppercase transition disabled:opacity-40"
              style={{ backgroundColor: '#053221', color: '#c8a96e' }}
            >
              {submitting ? 'Bezig...' : 'Ik ga akkoord'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
