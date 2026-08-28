'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { formatEuros } from '@/lib/format'
import type { Invoice } from '@/lib/types'

// De lijst-API stuurt per factuur de betaal-status van de bijbehorende klant mee.
interface InvoiceRow extends Invoice {
  paidAt: string | null
}

export default function AdminInvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/invoices')
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.invoices || [])
      }
      setLoading(false)
    }
    load()
  }, [router])

  const total = invoices.reduce((sum, i) => sum + i.amount, 0)

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#e8ede9' }}>
      <header className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#053221' }}>
        <div className="flex items-center gap-3">
          <Image src="/logoBJAYv3.0-iconbackground.png" alt="Bjay.photo" width={32} height={32} />
          <h1
            className="text-xl font-bold tracking-widest uppercase"
            style={{ color: '#c8a96e', fontFamily: 'var(--font-jost), sans-serif' }}
          >
            Bjay.photo
          </h1>
          <span className="text-xs tracking-widest uppercase" style={{ color: 'rgba(200,169,110,0.5)' }}>
            / Facturen
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/invoices/preview')}
            className="text-sm transition hover:opacity-70"
            style={{ color: 'rgba(232,237,233,0.6)' }}
          >
            Voorbeeld
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

      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
        {loading ? (
          <p style={{ color: '#4a6358' }}>Laden...</p>
        ) : invoices.length === 0 ? (
          <div
            className="rounded-lg p-6 flex flex-col gap-2"
            style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
          >
            <p className="text-sm" style={{ color: '#053221' }}>Nog geen facturen.</p>
            <p className="text-xs" style={{ color: '#4a6358' }}>
              Je maakt een factuur aan op de pagina van een klant, onder de knop &lsquo;Maak factuur&rsquo;.
              Vul daar eerst het factuuradres en het bedrag in.
            </p>
          </div>
        ) : (
          <>
            <div
              className="rounded-lg p-6 flex flex-col gap-1"
              style={{ backgroundColor: '#053221', border: '1px solid rgba(200,169,110,0.3)' }}
            >
              <span className="text-xs tracking-widest uppercase" style={{ color: 'rgba(200,169,110,0.7)' }}>
                Gefactureerd
              </span>
              <span className="text-3xl font-bold" style={{ color: '#c8a96e' }}>
                {formatEuros(total)}
              </span>
              <span className="text-xs" style={{ color: 'rgba(200,169,110,0.7)' }}>
                {invoices.length} factu{invoices.length !== 1 ? 'ren' : 'ur'}
              </span>
            </div>

            <div
              className="rounded-lg overflow-hidden"
              style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.3)' }}
            >
              {invoices.map(invoice => (
                <button
                  key={invoice.number}
                  onClick={() => router.push(`/admin/invoices/${invoice.number}`)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition hover:opacity-70"
                  style={{ borderTop: '1px solid rgba(200,169,110,0.15)' }}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm flex items-center gap-2">
                      <span className="font-mono" style={{ color: '#c8a96e' }}>{invoice.number}</span>
                      <span className="truncate" style={{ color: '#053221' }}>{invoice.customerName}</span>
                    </span>
                    <span className="text-xs" style={{ color: 'rgba(74,99,88,0.7)' }}>
                      {new Date(`${invoice.invoiceDate}T12:00:00`).toLocaleDateString('nl-NL')}
                      {invoice.paidAt ? (
                        <span style={{ color: '#2d8a3e' }}> · betaald</span>
                      ) : (
                        <span style={{ color: '#c8a96e' }}> · openstaand</span>
                      )}
                    </span>
                  </div>
                  <span className="text-sm whitespace-nowrap" style={{ color: '#053221' }}>
                    {formatEuros(invoice.amount)}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-xs" style={{ color: 'rgba(74,99,88,0.8)' }}>
              &lsquo;Betaald&rsquo; komt van de betaald-markering op de shoot zelf; het omzet-overzicht
              rekent met diezelfde markering, niet met deze facturen.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
