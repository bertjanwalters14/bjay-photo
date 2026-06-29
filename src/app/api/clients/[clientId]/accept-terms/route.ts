import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { canActAsClient } from '@/lib/auth'
import type { Client } from '@/lib/types'

// POST — de klant (ingelogd met de code, of admin) legt akkoord op de algemene
// voorwaarden vast. Idempotent: het eerste akkoord-moment blijft staan.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
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

  // Al akkoord? Behoud het oorspronkelijke moment.
  if (client.termsAcceptedAt) {
    return NextResponse.json({ client })
  }

  const updated: Client = { ...client, termsAcceptedAt: new Date().toISOString() }
  await redis.set(`client:${clientId}`, updated)

  return NextResponse.json({ client: updated })
}
