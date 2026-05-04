import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import redis from '@/lib/redis'
import { getAdminSession } from '@/lib/auth'
import { calculatePriceForCount, priceForUnlimited } from '@/lib/eventPackages'
import cloudinary from '@/lib/cloudinary'
import type { Order } from '@/lib/types'

// Bouw schone Cloudinary delivery URL uit publicId (geen transformaties)
function cleanCloudinaryUrl(publicId: string): string {
  return cloudinary.url(publicId, { secure: true })
}

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

// GET (admin)
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

// POST — nieuwe bestelling
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const clientName: string = (body?.clientName || '').toString()
    const clientCode: string = (body?.clientCode || '').toString()
    const customerName: string = (body?.customerName || '').toString().trim().slice(0, 80)
    const customerEmail: string = (body?.customerEmail || '').toString().trim().slice(0, 120)

    if (!clientCode) {
      return NextResponse.json({ error: 'Ontbrekende clientCode' }, { status: 400 })
    }

    const isEventOrder = body?.packageType === 'unlimited' || body?.packageType === 'custom'

    let order: Order

    if (isEventOrder) {
      const isUnlimited = body.packageType === 'unlimited'
      // Accepteer photoIds (nieuw) of photoUrls (legacy backwards-compat)
      const photoIdsRaw: unknown = body?.photoIds
      const photoUrlsLegacy: unknown = body?.photoUrls
      let photoUrls: string[] = []
      if (Array.isArray(photoIdsRaw)) {
        photoUrls = photoIdsRaw
          .filter((id: unknown): id is string => typeof id === 'string')
          .map((id: string) => cleanCloudinaryUrl(id))
      } else if (Array.isArray(photoUrlsLegacy)) {
        // Legacy support: oude clients sturen direct photoUrls
        photoUrls = photoUrlsLegacy.filter((u: unknown): u is string => typeof u === 'string')
      }

      if (!isUnlimited && photoUrls.length === 0) {
        return NextResponse.json(
          { error: 'Selecteer minstens 1 foto of kies onbeperkt' },
          { status: 400 }
        )
      }

      // Server-side prijsberekening (klant kan price niet manipuleren)
      const breakdown = isUnlimited
        ? priceForUnlimited()
        : calculatePriceForCount(photoUrls.length)

      const formatLabel = breakdown.isUnlimited
        ? 'Onbeperkt'
        : `${photoUrls.length} foto${photoUrls.length !== 1 ? "'s" : ''}`

      const now = new Date().toISOString()
      order = {
        id: nanoid(10),
        clientCode,
        clientName,
        customerName,
        customerEmail,
        photoUrl: photoUrls[0] || '',
        photoUrls: breakdown.isUnlimited ? [] : photoUrls,
        format: formatLabel,
        packageType: breakdown.isUnlimited ? 'unlimited' : 'custom',
        price: breakdown.priceLabel,
        status: 'new',
        notes: breakdown.parts.join(' + '),
        createdAt: now,
        updatedAt: now,
      }
    } else {
      // Personal print order - accepteer photoId of photoUrl (legacy)
      const photoIdInput: string = (body?.photoId || '').toString()
      const photoUrl: string = photoIdInput
        ? cleanCloudinaryUrl(photoIdInput)
        : (body?.photoUrl || '').toString()
      const format: string = (body?.format || '').toString()
      const price: string = (body?.price || '').toString()

      if (!photoUrl || !format || !price) {
        return NextResponse.json({ error: 'Ontbrekende velden' }, { status: 400 })
      }

      const now = new Date().toISOString()
      order = {
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
    }

    try {
      await redis.set(`order:${order.id}`, order)
      await redis.lpush('orders:all', order.id)
    } catch (err) {
      console.error('Redis error bij order:', err)
      return NextResponse.json({ error: 'Database fout' }, { status: 500 })
    }

    // Mail naar fotograaf
    const customerLine = customerName || customerEmail
      ? `Klant: ${customerName || '(geen naam)'} <${customerEmail || 'geen mail'}>`
      : 'Klant: (geen contactgegevens opgegeven)'

    const photoSummary = isEventOrder
      ? order.packageType === 'unlimited'
        ? 'Alle foto\'s (onbeperkt pakket)'
        : `${order.photoUrls?.length || 0} geselecteerde foto's:\n${(order.photoUrls || []).join('\n')}`
      : `Foto URL: ${order.photoUrl}`

    await sendMail(
      PHOTOGRAPHER_TO,
      `Nieuwe ${isEventOrder ? 'digitale' : 'print'}-bestelling van ${customerName || clientName}`,
      [
        'Nieuwe bestelling ontvangen!',
        '',
        `Portaal: ${clientName} (code: ${clientCode})`,
        customerLine,
        `Pakket/formaat: ${order.format}`,
        `Prijs: ${order.price}`,
        order.notes ? `Opbouw: ${order.notes}` : '',
        '',
        photoSummary,
        '',
        `Order ID: ${order.id}`,
      ].filter(Boolean).join('\n')
    )

    // Bevestiging naar klant
    if (customerEmail) {
      const klantSummary = isEventOrder
        ? order.packageType === 'unlimited'
          ? 'Pakket: Onbeperkt - alle foto\'s van het evenement'
          : `Selectie: ${order.format}`
        : `Formaat: ${order.format}`

      await sendMail(
        customerEmail,
        'Bevestiging van je fotobestelling - Bjay.photo',
        [
          `Hoi ${customerName || ''},`.trim(),
          '',
          'Bedankt voor je bestelling bij Bjay.photo!',
          '',
          'Wat je hebt besteld:',
          `  ${klantSummary}`,
          `  Prijs: ${order.price}`,
          '',
          'Hoe het verder gaat:',
          '  1. Ik stuur je binnenkort persoonlijk een betaalverzoek (Tikkie of iDEAL link).',
          isEventOrder
            ? '  2. Zodra de betaling binnen is, ontvang je de foto(s) zonder watermerk per mail.'
            : '  2. Zodra de betaling binnen is, regel ik de print en stuur ik je een update.',
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
    return NextResponse.json({ error: 'Server fout' }, { status: 500 })
  }
}
