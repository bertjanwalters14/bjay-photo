import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import redis from '@/lib/redis'
import { getAdminSession } from '@/lib/auth'
import { formatPrice } from '@/lib/format'
import type { Client, Order, OrderStatus } from '@/lib/types'

// POST — handmatige bestelling registreren (alleen admin). Voor betalingen die
// buiten de normale checkout om binnenkomen (bv. via WhatsApp/mail tijdens een
// storing). In tegenstelling tot de publieke /api/orders route: geen foto-ID's
// nodig, geen bevestigingsmails, gewoon een boekhoudkundig record dat meetelt
// in de omzet-telling.
export async function POST(req: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const body = await req.json()
  const clientCode = (body?.clientCode || '').toString().trim().toLowerCase()
  const customerName = (body?.customerName || '').toString().trim().slice(0, 80)
  const customerEmail = (body?.customerEmail || '').toString().trim().slice(0, 120)
  const description = (body?.description || '').toString().trim().slice(0, 200)
  const notes = (body?.notes || '').toString().trim().slice(0, 500)
  const status: OrderStatus = body?.status || 'paid'

  if (!clientCode) {
    return NextResponse.json({ error: 'Klant-code is verplicht' }, { status: 400 })
  }
  if (!description) {
    return NextResponse.json({ error: 'Omschrijving is verplicht' }, { status: 400 })
  }
  const price = formatPrice(body?.price)
  if (!price) {
    return NextResponse.json({ error: 'Prijs is verplicht' }, { status: 400 })
  }

  const client = await redis.get<Client>(`client:${clientCode}`)
  if (!client) {
    return NextResponse.json({ error: 'Klant niet gevonden (klopt de code?)' }, { status: 404 })
  }

  const now = new Date().toISOString()
  const order: Order = {
    id: nanoid(10),
    clientCode,
    clientName: client.name,
    customerName,
    customerEmail,
    photoUrl: '',
    format: `Handmatig: ${description}`,
    price,
    status,
    notes,
    createdAt: now,
    updatedAt: now,
  }

  try {
    await redis.set(`order:${order.id}`, order)
    await redis.lpush('orders:all', order.id)
  } catch (err) {
    console.error('Redis error bij handmatige order:', err)
    return NextResponse.json({ error: 'Database fout' }, { status: 500 })
  }

  return NextResponse.json({ success: true, order })
}
