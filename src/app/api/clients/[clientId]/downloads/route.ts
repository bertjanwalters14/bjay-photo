import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { getAdminSession, canActAsClient } from '@/lib/auth'

// GET — admin only: downloads-telling per foto + totaal.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params

  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const raw = await redis.hgetall<Record<string, number>>(`client:${clientId}:downloads`)
  const counts: Record<string, number> = {}
  let total = 0
  for (const [photoId, count] of Object.entries(raw || {})) {
    const n = Number(count) || 0
    counts[photoId] = n
    total += n
  }

  return NextResponse.json({ counts, total })
}

// POST — download loggen. Geen identiteit, alleen een teller per foto:
// we weten dus wel welke foto's vaak gedownload zijn, niet door wie.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params

  const allowed = await canActAsClient(clientId, req)
  if (!allowed) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const body = await req.json()
  const photoId: string | undefined = body?.photoId
  if (!photoId) {
    return NextResponse.json({ error: 'photoId is verplicht' }, { status: 400 })
  }

  await redis.hincrby(`client:${clientId}:downloads`, photoId, 1)
  return NextResponse.json({ ok: true })
}
