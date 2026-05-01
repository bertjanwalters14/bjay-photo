import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { getClientSession, getAdminSession } from '@/lib/auth'
import type { Like } from '@/lib/types'

// Helper: zet een naam om naar een uniciteits-slug (voor field key in de hash)
function nameSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // diacrieten weg
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function fieldKey(photoId: string, name: string) {
  return `${photoId}::${nameSlug(name)}`
}

// GET — likes ophalen
// Admin krijgt volledige lijst per foto met namen.
// Client (visitor) krijgt alleen counts per foto + zijn eigen likes (op basis van naam in query string).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params

  const clientCode = await getClientSession()
  const isAdmin = await getAdminSession()

  if (!isAdmin && clientCode !== clientId) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const raw = await redis.hgetall<Record<string, Like>>(`client:${clientId}:likes`)
  const entries: Like[] = raw ? Object.values(raw) : []

  if (isAdmin) {
    // Groepeer per foto met namen
    const byPhoto: Record<string, { count: number; names: { name: string; createdAt: string }[] }> = {}
    for (const e of entries) {
      if (!byPhoto[e.photoId]) byPhoto[e.photoId] = { count: 0, names: [] }
      byPhoto[e.photoId].count += 1
      byPhoto[e.photoId].names.push({ name: e.name, createdAt: e.createdAt })
    }
    return NextResponse.json({ likes: byPhoto, total: entries.length })
  }

  // Visitor: counts + eigen likes (op basis van ?name=)
  const url = new URL(req.url)
  const visitorName = url.searchParams.get('name') || ''
  const visitorSlug = visitorName ? nameSlug(visitorName) : ''

  const counts: Record<string, number> = {}
  const mine: string[] = []
  for (const e of entries) {
    counts[e.photoId] = (counts[e.photoId] || 0) + 1
    if (visitorSlug && nameSlug(e.name) === visitorSlug) {
      mine.push(e.photoId)
    }
  }

  return NextResponse.json({ counts, mine })
}

// POST — toggle like met naam
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const clientCode = await getClientSession()

  if (clientCode !== clientId) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const body = await req.json()
  const photoId: string | undefined = body?.photoId
  const name: string | undefined = body?.name

  if (!photoId || !name || !name.trim()) {
    return NextResponse.json({ error: 'photoId en naam zijn verplicht' }, { status: 400 })
  }

  const trimmedName = name.trim().slice(0, 60)
  if (!nameSlug(trimmedName)) {
    return NextResponse.json({ error: 'Ongeldige naam' }, { status: 400 })
  }

  const key = `client:${clientId}:likes`
  const field = fieldKey(photoId, trimmedName)

  const existing = await redis.hget<Like>(key, field)

  if (existing) {
    // unlike
    await redis.hdel(key, field)
    return NextResponse.json({ liked: false })
  }

  const like: Like = {
    photoId,
    name: trimmedName,
    createdAt: new Date().toISOString(),
  }
  await redis.hset(key, { [field]: like })
  return NextResponse.json({ liked: true })
}
