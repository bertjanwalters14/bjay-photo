import { NextRequest, NextResponse } from 'next/server'
import { clearClientSession, clearAdminSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { role } = await req.json()

  if (role === 'admin') {
    await clearAdminSession()
  } else {
    await clearClientSession()
  }

  return NextResponse.json({ success: true })
}