import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { getAdminSession } from '@/lib/auth'
import { archiveClientPhotos } from '@/lib/archive'
import type { Client } from '@/lib/types'

// POST — handmatig de Cloudinary-foto's van een klant verwijderen en
// markeren als gearchiveerd. Alleen admin. Bypassed de 30-dagen-wachttijd
// en de open-orders-check; jij weet zelf wat je doet.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { clientId } = await params
  const result = await archiveClientPhotos(clientId)

  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Archiveren mislukt' }, { status: 500 })
  }

  // Stuur de bijgewerkte client mee zodat de UI direct kan refreshen.
  const client = await redis.get<Client>(`client:${clientId}`)
  return NextResponse.json({ success: true, client })
}
