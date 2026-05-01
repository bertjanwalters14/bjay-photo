import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import {
  getAdminSession,
  getClientOrPreviewSession,
  canActAsClient,
} from '@/lib/auth'

// GET — favorieten ophalen
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params

  const isAdmin = await getAdminSession()
  const clientCode = await getClientOrPreviewSession(req)

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

  const allowed = await canActAsClient(clientId, req)
  if (!allowed) {
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
