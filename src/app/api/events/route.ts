import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { createEvent, getAllEvents } from '@/lib/events'

// GET — admin only: lijst van alle events.
export async function GET() {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const events = await getAllEvents()
  return NextResponse.json({ events })
}

// POST — admin only: nieuw event aanmaken.
export async function POST(req: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const body = await req.json()
  const name: string | undefined = body?.name
  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 })
  }

  try {
    const event = await createEvent({
      name,
      slug: body?.slug,
      label: body?.label,
      description: body?.description,
      password: body?.password,
      loginUrl: body?.loginUrl,
      dismissKey: body?.dismissKey,
      popupActive: body?.popupActive,
      requestable: body?.requestable,
    })
    return NextResponse.json({ event })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database fout'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
