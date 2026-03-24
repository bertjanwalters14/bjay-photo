import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { getClientSession, getAdminSession } from '@/lib/auth'
import { Feedback } from '@/lib/types'

// GET — feedback ophalen (admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const isAdmin = await getAdminSession()

  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const raw = await redis.lrange(`client:${clientId}:feedback`, 0, -1)
  const feedback = raw.map(item =>
    typeof item === 'string' ? JSON.parse(item) : item
  )

  return NextResponse.json({ feedback })
}

// POST — feedback versturen (klant)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const clientCode = await getClientSession()

  if (clientCode !== clientId) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { photoId, message } = await req.json()

  if (!message) {
    return NextResponse.json({ error: 'Bericht is verplicht' }, { status: 400 })
  }

  const feedback: Feedback = {
    photoId,
    message,
    createdAt: new Date().toISOString(),
  }

  await redis.lpush(`client:${clientId}:feedback`, JSON.stringify(feedback))

  return NextResponse.json({ success: true })
}