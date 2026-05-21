import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { createClientSession } from '@/lib/auth'
import { clientLoginLimiter, getClientIp } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  // Rate limit op IP. Voorkomt dat iemand klantcodes kan brute-forcen.
  const ip = getClientIp(req)
  const { success, reset } = await clientLoginLimiter.limit(ip)
  if (!success) {
    const secondsLeft = Math.ceil((reset - Date.now()) / 1000)
    return NextResponse.json(
      { error: `Te veel pogingen. Probeer over ${secondsLeft} seconden opnieuw.` },
      { status: 429, headers: { 'Retry-After': String(secondsLeft) } },
    )
  }

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