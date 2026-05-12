import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { deleteEvent, getEvent, updateEvent } from '@/lib/events'

// GET — admin only: detail van één event.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { slug } = await params
  const event = await getEvent(slug)
  if (!event) {
    return NextResponse.json({ error: 'Event niet gevonden' }, { status: 404 })
  }

  return NextResponse.json({ event })
}

// PATCH — admin only: event bijwerken.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { slug } = await params
  const body = await req.json()

  const event = await updateEvent(slug, {
    name: body?.name,
    label: body?.label,
    description: body?.description,
    password: body?.password,
    loginUrl: body?.loginUrl,
    dismissKey: body?.dismissKey,
    popupActive: body?.popupActive,
    requestable: body?.requestable,
  })

  if (!event) {
    return NextResponse.json({ error: 'Event niet gevonden' }, { status: 404 })
  }

  return NextResponse.json({ event })
}

// DELETE — admin only: event verwijderen.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { slug } = await params
  const ok = await deleteEvent(slug)
  if (!ok) {
    return NextResponse.json({ error: 'Event niet gevonden' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
