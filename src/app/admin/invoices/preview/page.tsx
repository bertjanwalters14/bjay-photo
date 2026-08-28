'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import InvoiceSheet, { INVOICE_PRINT_CSS } from '@/components/InvoiceSheet'
import { INVOICE_SENDER, PAYMENT_TERM_DAYS, VAT_RATE } from '@/lib/invoiceSettings'
import type { Invoice } from '@/lib/types'

// Preview van de factuur-opmaak met test-data, in dezelfde geest als
// /admin/mail-preview. Slaat niets op en verbruikt geen factuurnummer, dus je
// kunt hier vrij de opmaak en de afdruk checken.
const SAMPLE: Invoice = {
  number: '2026-001',
  clientCode: 'voorbeeld',
  createdAt: new Date().toISOString(),
  invoiceDate: '2026-07-08',
  dueDate: '2026-07-22',
  deliveryDate: '2026-07-05',
  customerName: 'Tennisvereniging GLTB',
  customerAddress: 'T.a.v. de penningmeester\nSportlaan 5\n9700 AA Groningen',
  customerEmail: 'penningmeester@voorbeeld.nl',
  description: 'Fotoreportage GLTB Open 2026',
  amount: 500,
  vatRate: VAT_RATE,
  vatAmount: Math.round(500 * VAT_RATE * 100) / 100,
  totalIncl: Math.round(500 * (1 + VAT_RATE) * 100) / 100,
  sender: INVOICE_SENDER,
}

export default function InvoicePreviewPage() {
  const router = useRouter()

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
            / Factuur-preview
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
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs" style={{ color: '#4a6358' }}>
            Voorbeeldfactuur met test-data. Er wordt niets opgeslagen en er gaat geen
            factuurnummer verloren.
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
          Afzendergegevens, betaaltermijn ({PAYMENT_TERM_DAYS} dagen) en het btw-tarief komen uit
          src/lib/invoiceSettings.ts. Klopt er iets niet, pas dat bestand dan aan.
        </p>

        <InvoiceSheet invoice={SAMPLE} />
      </div>
    </main>
  )
}
