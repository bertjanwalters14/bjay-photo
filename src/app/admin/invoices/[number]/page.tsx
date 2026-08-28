'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import InvoiceSheet, { INVOICE_PRINT_CSS } from '@/components/InvoiceSheet'
import type { Invoice } from '@/lib/types'

export default function AdminInvoicePage() {
  const { number } = useParams<{ number: string }>()
  const router = useRouter()

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [paidAt, setPaidAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // Versturen: de admin slaat de factuur zelf op als PDF (printknop) en kiest
  // 'm hier; de server mailt 'm als bijlage.
  const [sendTo, setSendTo] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/invoices/${number}`)
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setInvoice(data.invoice)
        setPaidAt(data.paidAt ?? null)
        setSendTo(data.invoice?.customerEmail || '')
      }
      setLoading(false)
    }
    load()
  }, [number, router])

  // Bestand als data-URL inlezen; de server pelt de prefix eraf.
  function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Bestand kon niet gelezen worden'))
      reader.readAsDataURL(file)
    })
  }

  async function handleSend() {
    if (!pdfFile) return
    setSending(true)
    setSendError('')
    try {
      const pdfBase64 = await readAsDataUrl(pdfFile)
      const res = await fetch(`/api/invoices/${number}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: sendTo, pdfBase64 }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSendError(data?.error || 'Versturen mislukt')
        return
      }
      setInvoice(data.invoice)
      setPdfFile(null)
    } catch {
      setSendError('Versturen mislukt')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#e8ede9' }}>
      <style>{INVOICE_PRINT_CSS}</style>

      <header
        className="no-print px-6 py-4 flex items-center justify-between"
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
            / Factuur {invoice?.number ?? ''}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/invoices')}
            className="text-sm transition hover:opacity-70"
            style={{ color: 'rgba(232,237,233,0.6)' }}
          >
            Facturen
          </button>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="text-sm transition hover:opacity-70"
            style={{ color: 'rgba(232,237,233,0.6)' }}
          >
            Dashboard
          </button>
        </div>
      </header>

      <div className="invoice-page max-w-3xl mx-auto px-4 py-8 flex flex-col gap-4">
        {loading ? (
          <p className="no-print" style={{ color: '#4a6358' }}>Laden...</p>
        ) : !invoice ? (
          <p className="no-print" style={{ color: '#4a6358' }}>Factuur niet gevonden.</p>
        ) : (
          <>
            {/* Admin-balk: staat niet op de afdruk */}
            <div className="no-print flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs" style={{ color: '#4a6358' }}>
                {paidAt ? (
                  <>
                    Betaald op{' '}
                    <span style={{ color: '#2d8a3e' }}>
                      {new Date(paidAt).toLocaleDateString('nl-NL')}
                    </span>
                  </>
                ) : (
                  <>
                    Nog niet als betaald gemarkeerd ·{' '}
                    <button
                      onClick={() => router.push(`/admin/clients/${invoice.clientCode}`)}
                      className="underline"
                      style={{ color: '#c8a96e' }}
                    >
                      naar de shoot
                    </button>
                  </>
                )}
              </p>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-medium tracking-widest uppercase transition hover:opacity-80"
                style={{ backgroundColor: '#053221', color: '#c8a96e' }}
              >
                Print / opslaan als PDF
              </button>
            </div>
            <p className="no-print text-xs" style={{ color: 'rgba(74,99,88,0.8)' }}>
              Kies in het printvenster bij Bestemming voor &lsquo;Opslaan als PDF&rsquo;. Zet
              koptekst en voettekst uit voor een schone factuur.
            </p>

            {/* Versturen: opgeslagen PDF kiezen, de server mailt 'm als bijlage */}
            <div
              className="no-print p-3 flex flex-col gap-2"
              style={{ backgroundColor: 'rgba(200,169,110,0.08)', border: '1px solid rgba(200,169,110,0.4)' }}
            >
              <p className="text-xs" style={{ color: '#4a6358' }}>
                {invoice.sentAt ? (
                  <>
                    Factuur gemaild op{' '}
                    <span style={{ color: '#2d8a3e' }}>
                      {new Date(invoice.sentAt).toLocaleDateString('nl-NL')}
                    </span>
                    . Opnieuw sturen kan hieronder.
                  </>
                ) : (
                  <>Sla de factuur eerst op als PDF met de knop hierboven, kies &lsquo;m hier en verstuur.</>
                )}
              </p>
              <label className="text-xs" style={{ color: '#4a6358' }}>
                Naar
                <input
                  type="email"
                  value={sendTo}
                  onChange={e => setSendTo(e.target.value)}
                  placeholder="naam@voorbeeld.nl"
                  className="w-full mt-1 px-2 py-1.5 text-sm focus:outline-none"
                  style={{ border: '1px solid rgba(200,169,110,0.4)', color: '#053221', backgroundColor: '#fff' }}
                />
              </label>
              <label className="text-xs" style={{ color: '#4a6358' }}>
                De opgeslagen PDF
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e => {
                    setPdfFile(e.target.files?.[0] ?? null)
                    setSendError('')
                  }}
                  className="w-full mt-1 text-sm"
                  style={{ color: '#053221' }}
                />
              </label>
              {sendError && (
                <p className="text-xs" style={{ color: '#a05a5a' }}>{sendError}</p>
              )}
              <div>
                <button
                  onClick={handleSend}
                  disabled={sending || !pdfFile || !sendTo.trim()}
                  className="px-3 py-1.5 text-xs font-medium tracking-widest uppercase transition hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: '#053221', color: '#c8a96e' }}
                >
                  {sending ? 'Versturen...' : invoice.sentAt ? 'Opnieuw versturen' : 'Verstuur factuur'}
                </button>
              </div>
              <p className="text-xs" style={{ color: 'rgba(74,99,88,0.8)' }}>
                De klant krijgt een mail in de huisstijl met de factuur als bijlage
                (Factuur-{invoice.number}.pdf). Je krijgt er zelf een kopie van.
              </p>
            </div>

            <InvoiceSheet invoice={invoice} />
          </>
        )}
      </div>
    </main>
  )
}
