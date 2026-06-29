import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { getAdminSession } from '@/lib/auth'
import { sendBookingMail } from '@/lib/clientMail'
import type { Client } from '@/lib/types'

// POST — admin only: stuur de klant de boekingsbevestiging (shoot + datum +
// bedrag + knop naar de akkoord-pagina) via Resend en leg vast wanneer dat is
// gebeurd. Alleen voor personal shoots.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
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
  if (client.type === 'event') {
    return NextResponse.json(
      { error: 'Boekingsbevestiging is alleen voor personal shoots' },
      { status: 400 },
    )
  }
  if (!client.email) {
    return NextResponse.json(
      { error: 'Deze klant heeft geen e-mailadres' },
      { status: 400 },
    )
  }

  const ok = await sendBookingMail(client)
  if (!ok) {
    return NextResponse.json(
      { error: 'Mail kon niet verstuurd worden' },
      { status: 500 },
    )
  }

  const updated: Client = { ...client, bookingMailSentAt: new Date().toISOString() }
  await redis.set(`client:${clientId}`, updated)

  return NextResponse.json({ client: updated })
}
