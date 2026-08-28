import Image from 'next/image'
import { formatEuros } from '@/lib/format'
import { formatVatRate } from '@/lib/invoiceSettings'
import type { Invoice } from '@/lib/types'

const MONTHS_NL = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

// 'YYYY-MM-DD' -> '28 augustus 2026'. Op middag geparsed zodat de tijdzone de
// datum niet een dag laat verspringen.
function longDate(date: string | undefined): string {
  if (!date) return ''
  const d = new Date(`${date}T12:00:00`)
  if (Number.isNaN(d.getTime())) return date
  return `${d.getDate()} ${MONTHS_NL[d.getMonth()]} ${d.getFullYear()}`
}

// Print-regels: op papier alleen het factuurvel, admin-chrome eraf. Alles met
// className "no-print" verdwijnt bij het afdrukken.
//
// De wrapper om het vel heen krijgt className "invoice-page"; die wordt bij
// het printen platgeslagen. Zonder dat blijft de max-w-3xl (768px = 203mm)
// staan, breder dan de 174mm die binnen de A4-marges past, en schaalt de
// browser de hele factuur kleiner.
export const INVOICE_PRINT_CSS = `
@page { size: A4; margin: 18mm; }
@media print {
  .no-print { display: none !important; }
  html, body { background: #fff !important; }
  .invoice-page {
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    gap: 0 !important;
  }
  .invoice-sheet {
    box-shadow: none !important;
    border: none !important;
    margin: 0 !important;
    padding: 0 !important;
    width: auto !important;
    max-width: none !important;
  }
}
`

// Het factuurvel zelf. Rendert puur wat er in de factuur is vastgelegd; er
// wordt hier niets uit de klant of uit invoiceSettings bijgehaald, zodat een
// oude factuur er over een jaar nog exact zo uitziet.
export default function InvoiceSheet({ invoice }: { invoice: Invoice }) {
  const sender = invoice.sender
  // Facturen van vóór de btw-plicht hebben geen vatRate; die tonen alleen hun
  // oude tekstregel en één totaal, zodat ze blijven kloppen zoals ze destijds
  // zijn uitgeschreven.
  const hasVat = typeof invoice.vatRate === 'number'
  const vatAmount = invoice.vatAmount ?? 0
  const total = invoice.totalIncl ?? invoice.amount

  return (
    <div
      className="invoice-sheet bg-white p-10 flex flex-col"
      style={{
        border: '1px solid rgba(200,169,110,0.4)',
        color: '#053221',
        // Hoogte van een A4 binnen de 18mm printmarges (297 - 36 = 261mm), met
        // een paar mm speling zodat afrondingsverschillen geen lege tweede
        // pagina opleveren. Samen met flex-col en de mt-auto op de voettekst
        // zakt die altijd naar de onderkant van het vel.
        minHeight: '254mm',
      }}
    >
      {/* Kop: afzender links, FACTUUR + meta rechts */}
      <div className="flex items-start justify-between gap-8">
        <div className="flex flex-col gap-3">
          {/* priority (dus geen lazy-loading): een logo dat nog niet geladen
              is ontbreekt op de afdruk. Verhouding 1912x702 van het bronbestand. */}
          <Image
            src="/logoBJAYv3.0.png"
            alt="BJAY Fotografie"
            width={150}
            height={55}
            priority
            style={{ width: '150px', height: 'auto' }}
          />
          <div className="text-xs leading-relaxed" style={{ color: '#4a6358' }}>
            <div style={{ color: '#053221', fontWeight: 600 }}>{sender.tradeName}</div>
            <div>{sender.name}</div>
            <div>{sender.address}</div>
            <div>{sender.postalCode} {sender.city}</div>
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-2xl font-bold tracking-widest uppercase"
            style={{ color: '#c8a96e', fontFamily: 'var(--font-jost), sans-serif' }}
          >
            Factuur
          </div>
          <table className="mt-3 text-xs ml-auto" style={{ color: '#4a6358' }}>
            <tbody>
              <tr>
                <td className="pr-3 text-left">Factuurnummer</td>
                <td className="text-right" style={{ color: '#053221', fontWeight: 600 }}>
                  {invoice.number}
                </td>
              </tr>
              <tr>
                <td className="pr-3 text-left">Factuurdatum</td>
                <td className="text-right" style={{ color: '#053221' }}>
                  {longDate(invoice.invoiceDate)}
                </td>
              </tr>
              <tr>
                <td className="pr-3 text-left">Vervaldatum</td>
                <td className="text-right" style={{ color: '#053221' }}>
                  {longDate(invoice.dueDate)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Klantgegevens */}
      <div className="mt-10">
        <div className="text-[10px] tracking-widest uppercase" style={{ color: '#c8a96e' }}>
          Factuur voor
        </div>
        <div className="mt-1 text-sm leading-relaxed">
          <div style={{ fontWeight: 600 }}>{invoice.customerName}</div>
          {invoice.customerAddress
            ? invoice.customerAddress.split('\n').map((line, i) => <div key={i}>{line}</div>)
            : null}
          {invoice.customerEmail && (
            <div style={{ color: '#4a6358' }}>{invoice.customerEmail}</div>
          )}
        </div>
      </div>

      {/* Factuurregel */}
      <table className="w-full mt-8 text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(200,169,110,0.6)' }}>
            <th
              className="text-left pb-2 text-[10px] tracking-widest uppercase font-medium"
              style={{ color: '#c8a96e' }}
            >
              Omschrijving
            </th>
            <th
              className="text-right pb-2 text-[10px] tracking-widest uppercase font-medium whitespace-nowrap"
              style={{ color: '#c8a96e' }}
            >
              {hasVat ? 'Bedrag excl. btw' : 'Bedrag'}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-3 align-top">
              {invoice.description}
              {invoice.deliveryDate && (
                <div className="text-xs mt-0.5" style={{ color: '#4a6358' }}>
                  Uitgevoerd op {longDate(invoice.deliveryDate)}
                </div>
              )}
            </td>
            <td className="py-3 text-right align-top whitespace-nowrap">
              {formatEuros(invoice.amount)}
            </td>
          </tr>
        </tbody>
        <tfoot>
          {hasVat && (
            <>
              <tr style={{ borderTop: '1px solid rgba(200,169,110,0.6)' }}>
                <td className="pt-3 text-right pr-4">Subtotaal excl. btw</td>
                <td className="pt-3 text-right whitespace-nowrap">
                  {formatEuros(invoice.amount)}
                </td>
              </tr>
              <tr>
                <td className="pt-1 text-right pr-4">
                  Btw {formatVatRate(invoice.vatRate as number)}
                </td>
                <td className="pt-1 text-right whitespace-nowrap">
                  {formatEuros(vatAmount)}
                </td>
              </tr>
            </>
          )}
          <tr style={{ borderTop: '1px solid rgba(200,169,110,0.6)' }}>
            <td className="pt-3 text-right pr-4" style={{ fontWeight: 600 }}>
              {hasVat ? 'Totaal te betalen incl. btw' : 'Totaal te betalen'}
            </td>
            <td className="pt-3 text-right whitespace-nowrap text-base" style={{ fontWeight: 700 }}>
              {formatEuros(total)}
            </td>
          </tr>
        </tfoot>
      </table>

      {invoice.vatNote && (
        <p className="mt-2 text-xs" style={{ color: '#4a6358' }}>
          {invoice.vatNote}
        </p>
      )}

      {/* Betaalinstructie */}
      <div
        className="mt-8 p-4 text-sm leading-relaxed"
        style={{ backgroundColor: 'rgba(200,169,110,0.1)', border: '1px solid rgba(200,169,110,0.4)' }}
      >
        Graag <strong>{formatEuros(total)}</strong> betalen voor{' '}
        <strong>{longDate(invoice.dueDate)}</strong> op rekening <strong>{sender.iban}</strong>{' '}
        t.n.v. {sender.accountName}, onder vermelding van factuurnummer{' '}
        <strong>{invoice.number}</strong>.
      </div>

      {/* Voettekst — mt-auto duwt 'm naar de onderkant van het vel. Contact
          links, de slogan rechts uitgelijnd ernaast. */}
      <div
        className="mt-auto pt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2"
        style={{ borderTop: '1px solid rgba(200,169,110,0.4)', color: '#4a6358' }}
      >
        <div className="text-[11px] flex flex-wrap gap-x-4 gap-y-1">
          <span>{sender.email}</span>
          <span>{sender.phone}</span>
          <span>bjay.photo</span>
          <span>IBAN {sender.iban}</span>
          {sender.vatNumber ? <span>Btw-nr {sender.vatNumber}</span> : null}
        </div>
        <div
          className="ml-auto text-right text-[10px] tracking-[0.1em] uppercase whitespace-nowrap"
          style={{ color: '#c8a96e' }}
        >
          Geen filter, wel gevoel
        </div>
      </div>
    </div>
  )
}
