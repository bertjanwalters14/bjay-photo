// Server-side factuur-logica: nummering, aanmaken en ophalen.
// Alleen importeren vanuit API-routes; dit bestand gebruikt de Redis-client.

import redis from './redis'
import { INVOICE_SENDER, PAYMENT_TERM_DAYS, VAT_RATE } from './invoiceSettings'
import type { Client, Invoice } from './types'

const INDEX_KEY = 'invoices:all'

function invoiceKey(number: string): string {
  return `invoice:${number}`
}

// 'YYYY-MM-DD' van een Date, zonder tijdzone-verrassingen.
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Vervaldatum = factuurdatum + betaaltermijn. Rekent op UTC-middag zodat een
// zomertijd-overgang de datum niet een dag laat verspringen.
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

// Volgend factuurnummer voor dit kalenderjaar: '2026-001', '2026-002', ...
// INCR is atomair, dus twee gelijktijdige aanvragen kunnen nooit hetzelfde
// nummer krijgen. Faalt het aanmaken daarna alsnog, dan ontstaat er een gat in
// de reeks; dat is uitlegbaar en veiliger dan een dubbel nummer.
async function nextInvoiceNumber(year: number): Promise<string> {
  const seq = await redis.incr(`invoice:counter:${year}`)
  return `${year}-${String(seq).padStart(3, '0')}`
}

export interface CreateInvoiceInput {
  client: Client
  description: string
  amount: number        // exclusief btw
  invoiceDate?: string  // 'YYYY-MM-DD', standaard vandaag
}

// Schrijft een factuur uit voor deze klant. Legt een volledige momentopname
// vast (klantgegevens, bedrag, afzender), zodat latere wijzigingen aan de
// klant of aan invoiceSettings deze factuur niet meer raken.
export async function createInvoice({
  client,
  description,
  amount,
  invoiceDate,
}: CreateInvoiceInput): Promise<Invoice> {
  const date = invoiceDate && /^\d{4}-\d{2}-\d{2}$/.test(invoiceDate) ? invoiceDate : isoDate(new Date())
  const year = parseInt(date.slice(0, 4), 10)
  const number = await nextInvoiceNumber(year)

  // Btw over het (exclusieve) bedrag, op hele centen afgerond.
  const vatAmount = Math.round(amount * VAT_RATE * 100) / 100

  const invoice: Invoice = {
    number,
    clientCode: client.code,
    createdAt: new Date().toISOString(),
    invoiceDate: date,
    dueDate: addDays(date, PAYMENT_TERM_DAYS),
    deliveryDate: client.date || undefined,
    customerName: client.name,
    customerAddress: client.invoiceAddress || undefined,
    customerEmail: client.email || undefined,
    customerContactName: client.contactName || undefined,
    description,
    amount,
    vatRate: VAT_RATE,
    vatAmount,
    totalIncl: Math.round((amount + vatAmount) * 100) / 100,
    sender: { ...INVOICE_SENDER },
  }

  await redis.set(invoiceKey(number), invoice)
  await redis.sadd(INDEX_KEY, number)

  return invoice
}

export async function getInvoice(number: string): Promise<Invoice | null> {
  return redis.get<Invoice>(invoiceKey(number))
}

// Legt vast dat de factuur is gemaild. Raakt bewust alleen sentAt; de rest van
// de factuur blijft de momentopname van het uitschrijven.
export async function markInvoiceSent(invoice: Invoice): Promise<Invoice> {
  const updated: Invoice = { ...invoice, sentAt: new Date().toISOString() }
  await redis.set(invoiceKey(invoice.number), updated)
  return updated
}

// Alle facturen, nieuwste nummer bovenaan. Nummers zijn zero-padded per jaar,
// dus een gewone string-sort geeft al de juiste volgorde.
export async function listInvoices(): Promise<Invoice[]> {
  const numbers = await redis.smembers(INDEX_KEY)
  if (!numbers.length) return []
  const records = await Promise.all(numbers.map(n => redis.get<Invoice>(invoiceKey(n))))
  return records
    .filter((i): i is Invoice => Boolean(i))
    .sort((a, b) => b.number.localeCompare(a.number))
}
