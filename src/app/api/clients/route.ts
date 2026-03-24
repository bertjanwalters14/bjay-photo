import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { getAdminSession } from '@/lib/auth'
import { nanoid } from 'nanoid'
import { Client } from '@/lib/types'

// GET — alle klanten ophalen
export async function GET() {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const codes = await redis.smembers('clients:all')

  if (!codes.length) {
    return NextResponse.json({ clients: [] })
  }

  const clients = await Promise.all(
    codes.map(code => redis.get<Client>(`client:${code}`))
  )

  return NextResponse.json({ clients: clients.filter(Boolean) })
}

// POST — nieuwe klant aanmaken
export async function POST(req: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { name, email } = await req.json()

  if (!name) {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 })
  }

  const code = nanoid(8).toLowerCase()

  const client: Client = {
    id: nanoid(),
    name,
    email: email || '',
    code,
    createdAt: new Date().toISOString(),
  }

  try {
    await redis.set(`client:${code}`, client)
    await redis.sadd('clients:all', code)
  } catch (err) {
    console.error('Redis error:', err)
    return NextResponse.json({ error: 'Database fout' }, { status: 500 })
  }

  return NextResponse.json({ client })
}