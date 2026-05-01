import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import redis from '@/lib/redis'
import { getAdminSession } from '@/lib/auth'
import type { Order } from '@/lib/types'

const FROM_ADDRESS = 'Bjay.photo <info@bjay.photo>'
const PHOTOGRAPHER_TO = 'bertjanwalters@gmail.com'

async function sendMail(to: string, subject: string, text: string) {
  if (!process.env.RESEND_API_KEY) return
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, text }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.error('Resend error:', data)
    }
  } catch (err) {
    console.error('Mail versturen mislukt:', err)
  }
}

// GET (admin) — alle bestellingen ophalen, nieuwste eerst
export async function GET() {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const ids = await redis.lrange<string>('orders:all', 0, -1)
  if (!ids.length) {
    return NextResponse.json({ orders: [] })
  }

  const orders = await Promise.all(ids.map(id => redis.get<Order>(`order:${id}`)))
  return NextResponse.json({ orders: orders.filter(Boolean) })
}

// POST — nieuwe bestelling vanuit galerij. Geen auth: visitor/klant plaatst order.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const photoUrl: string | undefined = body?.photoUrl
    const format: string | undefined = body?.format
    const price: string | undefined = body?.price
    const clientName: string = (body?.clientName || '').toString()
    const clientCode: string = (body?.clientCode || '').toString()
    const customerName: string = (body?.customerName || '').toString().trim().slice(0, 80)
    const customerEmail: string = (body?.customerEmail || '').toString().trim().slice(0, 120)

    if (!photoUrl || !format || !price || !clientCode) {
      return NextResponse.json({ error: 'Ontbrekende velden' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const order: Order = {
      id: nanoid(10),
      clientCode,
      clientName,
      customerName,
      customerEmail,
      photoUrl,
      format,
      price,
      status: 'new',
      notes: '',
      createdAt: now,
      updatedAt: now,
    }

    // Persist eerst zodat een mailfout de bestelling niet kwijtmaakt
    try {
      await redis.set(`order:${order.id}`, order)
      await redis.lpush('orders:all', order.id)
    } catch (err) {
      console.error('Redis error bij order:', err)
      return NextResponse.json({ error: 'Database fout' }, { status: 500 })
    }

    // Mail aan fotograaf (admin notificatie)
    const customerLine = customerName || customerEmail
      ? `Klant: ${customerName || '(geen naam)'} <${customerEmail || 'geen mail'}>`
      : 'Klant: (geen contactgegevens opgegeven)'

    await sendMail(
      PHOTOGRAPHER_TO,
      `Nieuwe fotobestelling van ${customerName || clientName}`,
      [
        'Nieuwe bestelling ontvangen!',
        '',
        `Portaal: ${clientName} (code: ${clientCode})`,
        customerLine,
        `Formaat: ${format}`,
        `Prijs: ${price}`,
        '',
        `Foto URL: ${photoUrl}`,
        '',
        `Order ID: ${order.id}`,
      ].join('\n')
    )

    // Mail aan klant (bevestiging)
    if (customerEmail) {
      await sendMail(
        customerEmail,
        'Bevestiging van je fotobestelling - Bjay.photo',
        [
          `Hoi ${customerName || ''},`.trim(),
          '',
          'Bedankt voor je bestelling bij Bjay.photo!',
          '',
          'Wat je hebt besteld:',
          `  Formaat: ${format}`,
          `  Prijs:   ${price}`,
          '',
          'Hoe het verder gaat:',
          '  1. Ik stuur je binnenkort persoonlijk een betaalverzoek (Tikkie of iDEAL link).',
          '  2. Zodra de betaling binnen is, ontvang je de foto zonder watermerk per mail.',
          '',
          'Mocht je vragen hebben, beantwoord deze mail dan gewoon.',
          '',
          'Tot snel!',
          'Bert-Jan - Bjay.photo',
        ].join('\n')
      )
    }

    return NextResponse.json({ success: true, orderId: order.id })
  } catch (err) {
    console.error('Orders route error:', err)
    return NextResponse.json({ error: 'Server fout', detail: String(err) }, { status: 500 })
  }
}
