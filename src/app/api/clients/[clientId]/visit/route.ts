import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { canActAsClient, getAdminSession } from '@/lib/auth'

// POST — registreer een portaalbezoek.
// Bewust simpel: increment counter + set timestamp. Geen IP, geen device-fingerprint.
// Admin/preview-bezoeken worden overgeslagen zodat de fotograaf niet z'n eigen
// test-clicks meetelt.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params

  const allowed = await canActAsClient(clientId, req)
  if (!allowed) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  // Skip admin/preview-bezoeken — die zijn van de fotograaf zelf.
  const isAdmin = await getAdminSession()
  if (isAdmin) {
    return NextResponse.json({ ok: true, counted: false })
  }

  try {
    await redis.set(`client:${clientId}:lastVisit`, new Date().toISOString())
    await redis.incr(`client:${clientId}:visitCount`)
  } catch (err) {
    console.error('Visit tracking error:', err)
    // Niet als fout teruggeven; tracking mag UI nooit blokkeren.
    return NextResponse.json({ ok: true, counted: false })
  }

  return NextResponse.json({ ok: true, counted: true })
}
