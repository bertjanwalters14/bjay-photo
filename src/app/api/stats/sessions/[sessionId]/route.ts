import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { getSessionActivity } from '@/lib/umami'

// GET — activity log (pageviews + events in chronologische volgorde)
// voor één specifieke sessie. Lazy geladen vanuit de stats-pagina
// zodra je een sessie-kaart openklapt.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { sessionId } = await params
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId verplicht' }, { status: 400 })
  }

  // 7 dagen window: Umami's session activity is per ses, we vragen breed
  // genoeg om altijd alles van die sessie te vangen.
  const end = Date.now()
  const start = end - 8 * 24 * 60 * 60 * 1000

  try {
    const activity = await getSessionActivity(sessionId, start, end)
    return NextResponse.json({ activity })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    console.error('Session activity error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
