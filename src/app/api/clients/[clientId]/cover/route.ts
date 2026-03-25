import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export async function GET(_: NextRequest, { params }: { params: { clientId: string } }) {
  const cover = await redis.get(`client:${params.clientId}:cover`)
  return NextResponse.json({ cover: cover || null })
}

export async function POST(req: NextRequest, { params }: { params: { clientId: string } }) {
  const { photoUrl } = await req.json()
  await redis.set(`client:${params.clientId}:cover`, photoUrl)
  return NextResponse.json({ success: true })
}