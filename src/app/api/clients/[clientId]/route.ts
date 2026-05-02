import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { canActAsClient } from '@/lib/auth'
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
