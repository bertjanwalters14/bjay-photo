import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { deleteRequest, markRequestHandled } from '@/lib/events'

// PATCH — admin only: aanvraag markeren als afgehandeld/openzetten.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const updated = await markRequestHandled(id, Boolean(body?.handled))
  if (!updated) {
    return NextResponse.json({ error: 'Aanvraag niet gevonden' }, { status: 404 })
  }
  return NextResponse.json({ request: updated })
}

// DELETE — admin only: aanvraag verwijderen.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { id } = await params
  const ok = await deleteRequest(id)
  if (!ok) {
    return NextResponse.json({ error: 'Aanvraag niet gevonden' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
