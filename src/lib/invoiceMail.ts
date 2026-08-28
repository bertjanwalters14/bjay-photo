// De factuurmail: standaard tekst in de huisstijl, met de factuur als
// PDF-bijlage. De PDF wordt niet server-side gegenereerd; BJAY slaat 'm op via
// de printknop op de factuurpagina en kiest 'm daar bij het versturen. Zo
// blijft er maar één plek waar de opmaak van de factuur leeft (InvoiceSheet).

import { sendBrandedMail, escapeHtml, greetingName } from './email'
import { formatEuros } from './format'
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

// Het te betalen bedrag: inclusief btw als die er is, anders het kale bedrag
// (facturen van vóór de btw-plicht).
function payable(invoice: Invoice): string {
  const total = invoice.totalIncl ?? invoice.amount
  return typeof invoice.vatRate === 'number'
    ? `${formatEuros(total)} inclusief btw`
    : formatEuros(total)
}

// Body (HTML) van de factuurmail. Ook gebruikt door /admin/mail-preview.
export function invoiceBodyHtml(invoice: Invoice): string {
  const { sender } = invoice
  return [
    `<p>Hoi ${escapeHtml(greeting(invoice))},</p>`,
    `<p>Hierbij de factuur voor <strong>${escapeHtml(invoice.description)}</strong>. Je vindt 'm als PDF in de bijlage.</p>`,
    `<p>Het bedrag is <strong>${payable(invoice)}</strong>. Graag betalen voor <strong>${longDate(invoice.dueDate)}</strong> op ${sender.iban} t.n.v. ${escapeHtml(sender.accountName)}, onder vermelding van factuurnummer <strong>${invoice.number}</strong>.</p>`,
    `<p>Klopt er iets niet of heb je een vraag over de factuur? Laat het gerust weten.</p>`,
  ].join('\n  ')
}

export function invoiceBodyText(invoice: Invoice): string {
  const { sender } = invoice
  return [
    `Hoi ${greeting(invoice)},`,
    `Hierbij de factuur voor ${invoice.description}. Je vindt 'm als PDF in de bijlage.`,
    `Het bedrag is ${payable(invoice)}. Graag betalen voor ${longDate(invoice.dueDate)} op ${sender.iban} t.n.v. ${sender.accountName}, onder vermelding van factuurnummer ${invoice.number}.`,
    'Klopt er iets niet of heb je een vraag over de factuur? Laat het gerust weten.',
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
