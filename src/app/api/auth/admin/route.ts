import { NextRequest, NextResponse } from 'next/server'
import { createAdminSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
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