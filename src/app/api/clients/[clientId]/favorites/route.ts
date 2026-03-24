import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { getClientSession, getAdminSession } from '@/lib/auth'

// GET — favorieten ophalen
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params

  const clientCode = await getClientSession()
  const isAdmin = await getAdminSession()

  if (!isAdmin && clientCode !== clientId) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const favorites = await redis.smembers(`client:${clientId}:favorites`)
  return NextResponse.json({ favorites })
}

// POST — favoriet toggelen
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const clientCode = await getClientSession()

  if (clientCode !== clientId) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { photoId } = await req.json()

  const isFav = await redis.sismember(`client:${clientId}:favorites`, photoId)

  if (isFav) {
    await redis.srem(`client:${clientId}:favorites`, photoId)
  } else {
    await redis.sadd(`client:${clientId}:favorites`, photoId)
  }

  return NextResponse.json({ success: true })
}