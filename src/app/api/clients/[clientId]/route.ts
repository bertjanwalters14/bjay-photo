import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { getAdminSession } from '@/lib/auth'
import { Client } from '@/lib/types'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const isAdmin = await getAdminSession()

  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const client = await redis.get<Client>(`client:${clientId}`)

  if (!client) {
    return NextResponse.json({ error: 'Klant niet gevonden' }, { status: 404 })
  }

  return NextResponse.json({ client })
}