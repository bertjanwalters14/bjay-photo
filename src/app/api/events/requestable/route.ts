import { NextResponse } from 'next/server'
import { getRequestableEvents } from '@/lib/events'

// GET — publiek (met CORS): lijst van events waarvoor wachtwoord aangevraagd
// kan worden. Wordt aangeroepen vanaf bjay.photo/event-toegang.html om de
// dropdown te vullen.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

// Defensieve helper: ook bij oude/migrated records een leesbare naam pakken.
// Kijkt naar alternatieve veldnamen en valt terug op een slug-gebaseerde
// titel als laatste vangnet. Voorkomt lege dropdown-opties op bjay.photo.
function readableName(e: Record<string, unknown>): string {
  const candidates = [e.name, e.title, e.eventName, e.label]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim()
  }
  if (typeof e.slug === 'string' && e.slug) {
    return e.slug.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase())
  }
  return '(naamloos event)'
}

export async function GET() {
  try {
    const events = await getRequestableEvents()
    // Alleen veilige velden teruggeven; wachtwoord absoluut NIET.
    // 'name' valt terug op slug-derived als hij om wat voor reden ook leeg is.
    const slimmed = events.map(e => ({
      slug: e.slug,
      name: readableName(e as unknown as Record<string, unknown>),
      description: e.description || '',
    }))
    return NextResponse.json({ events: slimmed }, { headers: corsHeaders })
  } catch (err) {
    console.error('requestable events GET error:', err)
    return NextResponse.json(
      { events: [], error: 'Server error' },
      { status: 500, headers: corsHeaders },
    )
  }
}
