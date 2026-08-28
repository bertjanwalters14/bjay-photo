import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { getInvoice, markInvoiceSent } from '@/lib/invoices'
import { sendInvoiceMail } from '@/lib/invoiceMail'

// Ruim onder de 4,5 MB die Vercel als request-body accepteert. Een factuur van
// één pagina is een paar honderd kB, dus dit raak je alleen als er per ongeluk
// een ander bestand wordt gekozen.
const MAX_PDF_BYTES = 3 * 1024 * 1024

// Geschatte bytes van een base64-string (4 tekens = 3 bytes, minus padding).
function base64Bytes(b64: string): number {
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0
  return Math.floor((b64.length * 3) / 4) - padding
}

// POST — mail de factuur als PDF-bijlage naar de klant (alleen admin).
// De PDF komt van de admin zelf (printknop op de factuurpagina, opslaan als
// PDF); er wordt hier niets gegenereerd.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { number } = await params
  const invoice = await getInvoice(number)
  if (!invoice) {
    return NextResponse.json({ error: 'Factuur niet gevonden' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))

  const to = typeof body?.to === 'string' && body.to.trim()
    ? body.to.trim()
    : (invoice.customerEmail || '')
  if (!to || !/^\S+@\S+\.\S+$/.test(to)) {
    return NextResponse.json(
      { error: 'Vul een geldig e-mailadres in om de factuur naartoe te sturen' },
      { status: 400 },
    )
  }

  const raw = typeof body?.pdfBase64 === 'string' ? body.pdfBase64 : ''
  // De browser levert een data-URL; alleen het base64-deel doorsturen.
  const pdfBase64 = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw
  if (!pdfBase64) {
    return NextResponse.json({ error: 'Geen PDF meegestuurd' }, { status: 400 })
  }
  // "JVBER" is de base64 van "%PDF" — vangt af dat er per ongeluk een JPG of
  // Word-bestand wordt gekozen.
  if (!pdfBase64.startsWith('JVBER')) {
    return NextResponse.json(
      { error: 'Het gekozen bestand is geen PDF' },
      { status: 400 },
    )
  }
  if (base64Bytes(pdfBase64) > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: 'De PDF is groter dan 3 MB; dat lijkt niet op een factuur' },
      { status: 400 },
    )
  }

  const ok = await sendInvoiceMail(invoice, to, pdfBase64)
  if (!ok) {
    return NextResponse.json(
      { error: 'Mail kon niet verstuurd worden' },
      { status: 500 },
    )
  }

  const updated = await markInvoiceSent(invoice)

  return NextResponse.json({ invoice: updated })
}
