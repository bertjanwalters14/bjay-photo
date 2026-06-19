import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { getAdminSession } from '@/lib/auth'
import { sendSneakPeekMail } from '@/lib/clientMail'
import type { Client } from '@/lib/types'

// POST — admin only: stuur de klant een sneak peek-mail (paar bewerkte
// favorieten vooraf), zelfde portaal-link, en leg vast wanneer dat is gebeurd.
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
  if (!client.email) {
    return NextResponse.json(
      { error: 'Deze klant heeft geen e-mailadres' },
      { status: 400 },
    )
  }

  const ok = await sendSneakPeekMail(client)
  if (!ok) {
    return NextResponse.json(
      { error: 'Mail kon niet verstuurd worden' },
      { status: 500 },
    )
  }

  const updated: Client = { ...client, sneakPeekSentAt: new Date().toISOString() }
  await redis.set(`client:${clientId}`, updated)

  return NextResponse.json({ client: updated })
}
