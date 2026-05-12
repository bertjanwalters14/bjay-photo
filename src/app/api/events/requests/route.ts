import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { getAllRequests } from '@/lib/events'

// GET — admin only: lijst van alle wachtwoord-aanvragen.
export async function GET() {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const requests = await getAllRequests()
  return NextResponse.json({ requests })
}
