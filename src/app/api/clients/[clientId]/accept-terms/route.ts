import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { canActAsClient } from '@/lib/auth'
import { sendInternalMail } from '@/lib/email'
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

  const now = new Date().toISOString()
  const updated: Client = { ...client, termsAcceptedAt: now }
  await redis.set(`client:${clientId}`, updated)

  // Seintje naar BJAY's inbox (best-effort; faalt dit, dan blijft het akkoord
  // wel gewoon vastgelegd).
  await sendInternalMail(
    `Akkoord voorwaarden: ${client.name}`,
    `${client.name} (code ${client.code}) is akkoord gegaan met de algemene voorwaarden op ${new Date(now).toLocaleString('nl-NL')}.`,
  )

  return NextResponse.json({ client: updated })
}
