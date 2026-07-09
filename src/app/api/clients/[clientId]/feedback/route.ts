import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { canActAsClient } from '@/lib/auth'
import { Feedback } from '@/lib/types'

// GET — feedback ophalen. Publiek reactie-draadje: elke bezoeker met
// toegang tot deze galerij (of admin) mag alle reacties zien.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params

  const allowed = await canActAsClient(clientId, req)
  if (!allowed) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const raw = await redis.lrange(`client:${clientId}:feedback`, 0, -1)
  const feedback = raw.map(item =>
    typeof item === 'string' ? JSON.parse(item) : item
  )

  return NextResponse.json({ feedback })
}

// POST — feedback versturen (klant of preview-mode admin)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params

  const allowed = await canActAsClient(clientId, req)
  if (!allowed) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { photoId, message, name } = await req.json()

  if (!message) {
    return NextResponse.json({ error: 'Bericht is verplicht' }, { status: 400 })
  }

  const feedback: Feedback = {
    photoId,
    message,
    createdAt: new Date().toISOString(),
    ...(name && typeof name === 'string' && name.trim() ? { name: name.trim().slice(0, 60) } : {}),
  }

  await redis.lpush(`client:${clientId}:feedback`, JSON.stringify(feedback))

  return NextResponse.json({ success: true, feedback })
}
