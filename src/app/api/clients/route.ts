import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { getAdminSession } from '@/lib/auth'
import { nanoid } from 'nanoid'
import { Client, PortalType } from '@/lib/types'

// GET — alle klanten ophalen
export async function GET() {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const codes = await redis.smembers('clients:all')

  if (!codes.length) {
    return NextResponse.json({ clients: [] })
  }

  const clients = await Promise.all(
    codes.map(code => redis.get<Client>(`client:${code}`))
  )

  // Backwards-compat: oudere records hebben nog geen `type`. Default naar 'personal'.
  const normalized = clients
    .filter((c): c is Client => Boolean(c))
    .map(c => ({ ...c, type: c.type ?? 'personal' as PortalType }))

  return NextResponse.json({ clients: normalized })
}

// POST — nieuwe klant aanmaken
export async function POST(req: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const body = await req.json()
  const name: string | undefined = body?.name
  const email: string | undefined = body?.email
  const type: PortalType = body?.type === 'event' ? 'event' : 'personal'
  const customCodeRaw: string | undefined = body?.customCode
  const date: string | undefined = typeof body?.date === 'string' ? body.date.trim() : undefined
  const contactName: string | undefined = typeof body?.contactName === 'string' ? body.contactName.trim() : undefined
  const price: string | undefined = typeof body?.price === 'string' ? body.price.trim() : undefined
  const personalNote: string | undefined = typeof body?.personalNote === 'string' ? body.personalNote.trim() : undefined
  const invoiceAddress: string | undefined = typeof body?.invoiceAddress === 'string' ? body.invoiceAddress.trim().slice(0, 300) : undefined

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 })
  }

  let code: string

  if (customCodeRaw && customCodeRaw.trim()) {
    const candidate = customCodeRaw.trim().toLowerCase()

    // Alleen letters, cijfers en streepje; lengte 4–32
    if (!/^[a-z0-9-]{4,32}$/.test(candidate)) {
      return NextResponse.json(
        {
          error:
            'Code mag alleen kleine letters, cijfers en streepjes bevatten (4–32 tekens)',
        },
        { status: 400 }
      )
    }

    const exists = await redis.exists(`client:${candidate}`)
    if (exists) {
      return NextResponse.json(
        { error: 'Deze code is al in gebruik' },
        { status: 409 }
      )
    }

    code = candidate
  } else {
    code = nanoid(8).toLowerCase()
  }

  const client: Client = {
    id: nanoid(),
    name: name.trim(),
    email: (email || '').trim(),
    code,
    type,
    createdAt: new Date().toISOString(),
    ...(date ? { date } : {}),
    ...(contactName ? { contactName } : {}),
    ...(price ? { price } : {}),
    ...(personalNote ? { personalNote } : {}),
    ...(invoiceAddress ? { invoiceAddress } : {}),
  }

  try {
    await redis.set(`client:${code}`, client)
    await redis.sadd('clients:all', code)
  } catch (err) {
    console.error('Redis error:', err)
    return NextResponse.json({ error: 'Database fout' }, { status: 500 })
  }

  return NextResponse.json({ client })
}
