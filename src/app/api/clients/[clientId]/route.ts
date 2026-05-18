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

  return NextResponse.json({ client: normalized })
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
