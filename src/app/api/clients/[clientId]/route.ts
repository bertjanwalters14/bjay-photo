import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import cloudinary from '@/lib/cloudinary'
import { canActAsClient, getAdminSession } from '@/lib/auth'
import type { Client, PortalType } from '@/lib/types'

// GET — client info ophalen.
// Toegankelijk voor: admin, ingelogde klant met dezelfde code, of preview-token.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params

  const allowed = await canActAsClient(clientId, req)
  if (!allowed) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const client = await redis.get<Client>(`client:${clientId}`)

  if (!client) {
    return NextResponse.json({ error: 'Klant niet gevonden' }, { status: 404 })
  }

  // Backwards-compat: oude records zonder type krijgen 'personal'
  const normalized: Client = { ...client, type: client.type ?? ('personal' as PortalType) }

  // Visit-stats alleen tonen aan admin. Klant zelf hoeft z'n eigen
  // bezoek-stats niet te zien.
  const isAdmin = await getAdminSession()
  if (isAdmin) {
    const [lastVisit, visitCountRaw] = await Promise.all([
      redis.get<string>(`client:${clientId}:lastVisit`),
      redis.get<string | number>(`client:${clientId}:visitCount`),
    ])
    const visitCount =
      typeof visitCountRaw === 'number'
        ? visitCountRaw
        : visitCountRaw
          ? parseInt(String(visitCountRaw), 10) || 0
          : 0
    return NextResponse.json({
      client: normalized,
      stats: { lastVisit: lastVisit || null, visitCount },
    })
  }

  return NextResponse.json({ client: normalized })
}

// PATCH — Specifieke velden op een klant updaten (alleen admin).
// Gebruikt voor de review-flow: deliveredAt, reviewRequestedAt, reviewReceived.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { clientId } = await params
  const client = await redis.get<Client>(`client:${clientId}`)
  if (!client) {
    return NextResponse.json({ error: 'Klant niet gevonden' }, { status: 404 })
  }

  const body = await req.json()
  const updates: Partial<Client> = {}

  if ('deliveredAt' in body) {
    updates.deliveredAt = body.deliveredAt || null
  }
  if ('reviewRequestedAt' in body) {
    updates.reviewRequestedAt = body.reviewRequestedAt || null
  }
  if ('reviewReceived' in body) {
    updates.reviewReceived = Boolean(body.reviewReceived)
  }
  if (typeof body.name === 'string') {
    const trimmed = body.name.trim().slice(0, 80)
    if (trimmed.length === 0) {
      return NextResponse.json({ error: 'Naam mag niet leeg zijn' }, { status: 400 })
    }
    updates.name = trimmed
  }
  if (typeof body.email === 'string') {
    const trimmed = body.email.trim().slice(0, 120)
    // Lege string is OK (mailadres verwijderen). Niet-leeg moet geldig zijn.
    if (trimmed.length > 0 && !/^\S+@\S+\.\S+$/.test(trimmed)) {
      return NextResponse.json({ error: 'Ongeldig e-mailadres' }, { status: 400 })
    }
    updates.email = trimmed
  }
  if ('date' in body) {
    updates.date = typeof body.date === 'string' && body.date.trim() ? body.date.trim() : undefined
  }
  if ('contactName' in body) {
    updates.contactName = typeof body.contactName === 'string' && body.contactName.trim() ? body.contactName.trim() : undefined
  }
  if ('price' in body) {
    updates.price = typeof body.price === 'string' && body.price.trim() ? body.price.trim() : undefined
  }
  if ('personalNote' in body) {
    updates.personalNote = typeof body.personalNote === 'string' && body.personalNote.trim() ? body.personalNote.trim() : undefined
  }

  const updated: Client = { ...client, ...updates }
  await redis.set(`client:${clientId}`, updated)

  return NextResponse.json({ client: updated })
}

// DELETE — klant volledig verwijderen (alleen admin).
// Ruimt op: Cloudinary foto-folder, alle redis keys voor deze klant,
// en haalt de code uit de clients:all set.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { clientId } = await params

  const exists = await redis.exists(`client:${clientId}`)
  if (!exists) {
    return NextResponse.json({ error: 'Klant niet gevonden' }, { status: 404 })
  }

  // Cloudinary opruimen — best-effort. Als dit faalt willen we de klant
  // alsnog uit Redis kunnen halen (anders blijft de admin met een spook-record).
  const prefix = `bjay/clients/${clientId}`
  try {
    await cloudinary.api.delete_resources_by_prefix(prefix)
    // Lege folder verwijderen (kan falen als folder al weg is — negeer).
    try {
      await cloudinary.api.delete_folder(prefix)
    } catch {
      // folder bestond niet of was niet leeg; geen probleem
    }
  } catch (err) {
    console.error('Cloudinary cleanup error for', clientId, err)
  }

  // Alle redis keys voor deze klant opruimen.
  try {
    await Promise.all([
      redis.del(`client:${clientId}`),
      redis.del(`client:${clientId}:cover`),
      redis.del(`client:${clientId}:favorites`),
      redis.del(`client:${clientId}:feedback`),
      redis.del(`client:${clientId}:likes`),
      redis.del(`client:${clientId}:lastVisit`),
      redis.del(`client:${clientId}:visitCount`),
    ])
    await redis.srem('clients:all', clientId)
  } catch (err) {
    console.error('Redis cleanup error for', clientId, err)
    return NextResponse.json(
      { error: 'Klant deels verwijderd, controleer database' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
