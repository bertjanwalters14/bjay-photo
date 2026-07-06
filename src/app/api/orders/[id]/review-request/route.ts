import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { getAdminSession } from '@/lib/auth'
import { sendReviewRequestTo } from '@/lib/reviews'
import type { Order } from '@/lib/types'

// POST (admin) — stuur de klant van deze bestelling een Google-review verzoek.
// Bedoeld nadat de bestelling op betaald/verzonden staat en de foto's geleverd
// zijn. Zet reviewRequestedAt bij succes zodat de knop "Opnieuw" toont.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { id } = await params
  const order = await redis.get<Order>(`order:${id}`)
  if (!order) {
    return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  }
  if (!order.customerEmail) {
    return NextResponse.json({ error: 'Geen e-mailadres bij deze bestelling' }, { status: 400 })
  }

  const ok = await sendReviewRequestTo({
    name: order.customerName || order.clientName || 'daar',
    email: order.customerEmail,
    subject: "Bedankt voor je foto's bij BJAY Fotografie",
  })
  if (!ok) {
    return NextResponse.json({ error: 'Mail kon niet verstuurd worden' }, { status: 500 })
  }

  const next: Order = { ...order, reviewRequestedAt: new Date().toISOString() }
  await redis.set(`order:${id}`, next)
  return NextResponse.json({ order: next })
}
