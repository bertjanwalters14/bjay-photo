import { NextResponse } from 'next/server'
import { getRequestableEvents, readableEventName } from '@/lib/events'

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

export async function GET() {
  try {
    const events = await getRequestableEvents()
    // Alleen veilige velden teruggeven; wachtwoord absoluut NIET.
    // 'name' valt terug op slug-derived als hij om wat voor reden ook leeg is.
    const slimmed = events.map(e => ({
      slug: e.slug,
      name: readableEventName(e),
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
