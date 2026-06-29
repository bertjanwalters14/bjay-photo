'use client'

import { useEffect, useState } from 'react'
import TermsAccept from '@/components/TermsAccept'
import type { Client } from '@/lib/types'

// Akkoord-pagina, bereikt via de knop in de boekingsmail (?code=...). Logt de
// klant in met de code (zelfde als de galerij), toont de boekingssamenvatting
// en legt het akkoord op de algemene voorwaarden vast.
export default function AkkoordPage() {
  const [client, setClient] = useState<Client | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function load() {
      const code = new URLSearchParams(window.location.search).get('code')?.toLowerCase()
      if (!code) {
        setStatus('error')
        setErrorMsg('Er ontbreekt een code in de link.')
        return
      }
      // Inloggen met de code (possessie van de code = toegang, net als de galerij).
      const loginRes = await fetch('/api/auth/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (!loginRes.ok) {
        setStatus('error')
        setErrorMsg('Deze link is niet (meer) geldig.')
        return
      }
      const cRes = await fetch(`/api/clients/${code}`)
      if (!cRes.ok) {
        setStatus('error')
        setErrorMsg('Kon je boeking niet laden. Probeer het later nog eens.')
        return
      }
      const data = await cRes.json()
      setClient(data.client || null)
      setStatus('ready')
    }
    load()
  }, [])

  async function handleAccept() {
    if (!client) return
    const res = await fetch(`/api/clients/${client.code}/accept-terms`, { method: 'POST' })
    if (!res.ok) throw new Error('accept failed')
    const data = await res.json()
    setClient(data.client)
  }

  if (status !== 'ready' || !client) {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: '#e8ede9' }}
      >
        <p className="text-sm" style={{ color: '#4a6358' }}>
          {status === 'error' ? errorMsg : 'Laden...'}
        </p>
      </main>
    )
  }

  return <TermsAccept client={client} onAccept={handleAccept} />
}
