// De factuurmail: standaard tekst in de huisstijl, met de factuur als
// PDF-bijlage. De PDF wordt niet server-side gegenereerd; BJAY slaat 'm op via
// de printknop op de factuurpagina en kiest 'm daar bij het versturen. Zo
// blijft er maar één plek waar de opmaak van de factuur leeft (InvoiceSheet).

import { sendBrandedMail, escapeHtml, greetingName } from './email'
import { formatEuros } from './format'
import { formatVatRate } from './invoiceSettings'
import type { Invoice } from './types'

const MONTHS_NL = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

function longDate(date: string): string {
  const d = new Date(`${date}T12:00:00`)
  if (Number.isNaN(d.getTime())) return date
  return `${d.getDate()} ${MONTHS_NL[d.getMonth()]} ${d.getFullYear()}`
}

// Bestandsnaam van de bijlage, ook gebruikt als de admin zelf niks meegeeft.
export function invoiceFilename(invoice: Invoice): string {
  return `Factuur-${invoice.number}.pdf`
}

function greeting(invoice: Invoice): string {
  return greetingName({
    contactName: invoice.customerContactName,
    name: invoice.customerName,
  })
}

// De bedrag-zin. Bij btw noemen we eerst het bedrag exclusief en dan het
// totaal, zodat de klant ziet wat de btw is maar het over te maken bedrag als
// laatste blijft staan — anders wordt er zo het exclusieve bedrag overgemaakt.
// Facturen van vóór de btw-plicht hebben geen vatRate en noemen één bedrag.
function amountSentence(invoice: Invoice, bold: (s: string) => string): string {
  if (typeof invoice.vatRate !== 'number') {
    return `Het gaat om ${bold(formatEuros(invoice.amount))}.`
  }
  const total = invoice.totalIncl ?? invoice.amount
  return `Het gaat om ${bold(formatEuros(invoice.amount))} exclusief btw; met ${formatVatRate(invoice.vatRate)} btw komt het totaal op ${bold(formatEuros(total))}.`
}

// Body (HTML) van de factuurmail. Ook gebruikt door /admin/mail-preview.
export function invoiceBodyHtml(invoice: Invoice): string {
  const { sender } = invoice
  return [
    `<p>Hoi ${escapeHtml(greeting(invoice))},</p>`,
    `<p>Bedankt voor de fijne samenwerking! Hierbij de factuur voor <strong>${escapeHtml(invoice.description)}</strong>, je vindt 'm als PDF in de bijlage.</p>`,
    `<p>${amountSentence(invoice, s => `<strong>${s}</strong>`)} Zou je dat bedrag voor <strong>${longDate(invoice.dueDate)}</strong> willen overmaken naar ${sender.iban} t.n.v. ${escapeHtml(sender.accountName)}, met factuurnummer <strong>${invoice.number}</strong> erbij?</p>`,
    `<p>Heb je een vraag of klopt er iets niet? Laat het gerust weten, dan kijk ik er even naar.</p>`,
  ].join('\n  ')
}

export function invoiceBodyText(invoice: Invoice): string {
  const { sender } = invoice
  return [
    `Hoi ${greeting(invoice)},`,
    `Bedankt voor de fijne samenwerking! Hierbij de factuur voor ${invoice.description}, je vindt 'm als PDF in de bijlage.`,
    `${amountSentence(invoice, s => s)} Zou je dat bedrag voor ${longDate(invoice.dueDate)} willen overmaken naar ${sender.iban} t.n.v. ${sender.accountName}, met factuurnummer ${invoice.number} erbij?`,
    'Heb je een vraag of klopt er iets niet? Laat het gerust weten, dan kijk ik er even naar.',
  ].join('\n\n')
}

// Verstuurt de factuurmail met de meegegeven PDF (base64) als bijlage.
export async function sendInvoiceMail(
  invoice: Invoice,
  to: string,
  pdfBase64: string,
): Promise<boolean> {
  return sendBrandedMail({
    to,
    subject: `Factuur ${invoice.number} - BJAY Fotografie`,
    bodyHtml: invoiceBodyHtml(invoice),
    bodyText: invoiceBodyText(invoice),
    attachments: [{ filename: invoiceFilename(invoice), content: pdfBase64 }],
  })
}
