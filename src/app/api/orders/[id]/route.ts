import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { getAdminSession } from '@/lib/auth'
import type { Order, OrderStatus } from '@/lib/types'

const ALLOWED_STATUSES: OrderStatus[] = [
  'new',
  'contacted',
  'paid',
  'shipped',
  'cancelled',
]

// PATCH (admin) — status of notitie bijwerken
export async function PATCH(
  req: NextRequest,
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

  const body = await req.json()
  const next: Order = { ...order, updatedAt: new Date().toISOString() }

  if (typeof body?.status === 'string') {
    if (!ALLOWED_STATUSES.includes(body.status as OrderStatus)) {
      return NextResponse.json({ error: 'Ongeldige status' }, { status: 400 })
    }
    next.status = body.status as OrderStatus
  }

  if (typeof body?.notes === 'string') {
    next.notes = body.notes.slice(0, 500)
  }

  await redis.set(`order:${id}`, next)
  return NextResponse.json({ order: next })
}

// DELETE (admin) — bestelling verwijderen (zelden, voor opschonen)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { id } = await params
  await redis.del(`order:${id}`)
  await redis.lrem('orders:all', 0, id)
  return NextResponse.json({ success: true })
}
