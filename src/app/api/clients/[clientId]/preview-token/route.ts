import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { getAdminSession } from '@/lib/auth'

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

export async function GET(_: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const token = await new SignJWT({ clientCode: clientId, role: 'preview' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret)

  return NextResponse.json({ token })
}