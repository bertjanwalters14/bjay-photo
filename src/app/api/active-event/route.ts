import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { getAdminSession } from '@/lib/auth'
import { ActiveEvent } from '@/lib/types'

const KEY = 'event:active'

// CORS headers zodat bjay.photo (ander domein) de GET kan aanroepen.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Pre-flight voor CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

// GET — publiek. Wordt aangeroepen vanaf bjay.photo om te checken of er een
// actief event is. Geeft altijd CORS headers terug.
export async function GET() {
  try {
    const event = await redis.get<ActiveEvent>(KEY)
    if (!event) {
      return NextResponse.json({ active: false }, { headers: corsHeaders })
    }
    return NextResponse.json(event, { headers: corsHeaders })
  } catch (err) {
    console.error('Active event GET error:', err)
    return NextResponse.json(
      { active: false, error: 'Server error' },
      { status: 500, headers: corsHeaders },
    )
  }
}

// POST — admin only. Stelt het actieve event in.
export async function POST(req: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const body = await req.json()

  const event: ActiveEvent = {
    active: Boolean(body?.active),
    label: String(body?.label || 'Live nu').trim(),
    name: String(body?.name || '').trim(),
    description: String(body?.description || '').trim(),
    password: String(body?.password || '').trim(),
    loginUrl:
      String(body?.loginUrl || '').trim() ||
      'https://bjay-photo.vercel.app/login',
    dismissKey: String(body?.dismissKey || '').trim(),
    updatedAt: new Date().toISOString(),
  }

  // Wanneer het event actief is, eisen we minimaal een naam en dismissKey.
  if (event.active) {
    if (!event.name) {
      return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 })
    }
    if (!event.dismissKey) {
      return NextResponse.json(
        { error: 'Dismiss-key is verplicht (uniek per evenement)' },
        { status: 400 },
      )
    }
  }

  try {
    await redis.set(KEY, event)
  } catch (err) {
    console.error('Active event POST error:', err)
    return NextResponse.json({ error: 'Database fout' }, { status: 500 })
  }

  return NextResponse.json({ event })
}

// DELETE — admin only. Wist het actieve event volledig.
export async function DELETE() {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  try {
    await redis.del(KEY)
  } catch (err) {
    console.error('Active event DELETE error:', err)
    return NextResponse.json({ error: 'Database fout' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
