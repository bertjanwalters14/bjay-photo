import { NextRequest, NextResponse } from 'next/server'
import { createAdminSession } from '@/lib/auth'
import { adminLoginLimiter, getClientIp } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  // Eerst rate limit checken op basis van IP. Voorkomt dat een aanvaller
  // ongelimiteerd wachtwoorden kan proberen.
  const ip = getClientIp(req)
  const { success, reset } = await adminLoginLimiter.limit(ip)
  if (!success) {
    const secondsLeft = Math.ceil((reset - Date.now()) / 1000)
    return NextResponse.json(
      { error: `Te veel pogingen. Probeer over ${secondsLeft} seconden opnieuw.` },
      { status: 429, headers: { 'Retry-After': String(secondsLeft) } },
    )
  }

  const { password } = await req.json()

  if (!password) {
    return NextResponse.json({ error: 'Wachtwoord is verplicht' }, { status: 400 })
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Onjuist wachtwoord' }, { status: 401 })
  }

  await createAdminSession()

  return NextResponse.json({ success: true })
}