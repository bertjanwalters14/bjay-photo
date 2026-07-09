import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import {
  getAdminSession,
  getClientOrPreviewSession,
  canActAsClient,
} from '@/lib/auth'
import type { Like } from '@/lib/types'

function nameSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function fieldKey(photoId: string, name: string) {
  return `${photoId}::${nameSlug(name)}`
}

// GET — likes ophalen
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params

  const isAdmin = await getAdminSession()
  const clientCode = await getClientOrPreviewSession(req)

  if (!isAdmin && clientCode !== clientId) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const raw = await redis.hgetall<Record<string, Like>>(`client:${clientId}:likes`)
  const entries: Like[] = raw ? Object.values(raw) : []

  const url = new URL(req.url)

  // De galerij stuurt altijd een 'name' query param mee (ook als admin in
  // preview-mode) en verwacht de {counts, mine} vorm. Alleen het admin-
  // dashboard vraagt zonder 'name' op en verwacht {likes, total}. Zonder deze
  // check kreeg een admin die zijn eigen galerij bekeek altijd de admin-vorm
  // terug (isAdmin is dan true), waardoor data.counts undefined was en de
  // like-badges in de galerij nooit toonden.
  if (isAdmin && !url.searchParams.has('name')) {
    const byPhoto: Record<string, { count: number; names: { name: string; createdAt: string }[] }> = {}
    for (const e of entries) {
      if (!byPhoto[e.photoId]) byPhoto[e.photoId] = { count: 0, names: [] }
      byPhoto[e.photoId].count += 1
      byPhoto[e.photoId].names.push({ name: e.name, createdAt: e.createdAt })
    }
    return NextResponse.json({ likes: byPhoto, total: entries.length })
  }

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

  const allowed = await canActAsClient(clientId, req)
  if (!allowed) {
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
