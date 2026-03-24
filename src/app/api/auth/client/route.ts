import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { createClientSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { code } = await req.json()

  if (!code) {
    return NextResponse.json({ error: 'Code is verplicht' }, { status: 400 })
  }

  const client = await redis.get(`client:${code.toLowerCase()}`)

  if (!client) {
    return NextResponse.json({ error: 'Ongeldige code' }, { status: 401 })
  }

  await createClientSession(code.toLowerCase())

  return NextResponse.json({ success: true })
}