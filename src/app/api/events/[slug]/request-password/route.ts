import { NextRequest, NextResponse } from 'next/server'
import { createEventRequest, getEvent, readableEventName, sendRequestNotification } from '@/lib/events'

// POST — publiek (met CORS): bezoeker dient wachtwoord-aanvraag in.
// Wordt aangeroepen vanaf bjay.photo/event-toegang.html.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const event = await getEvent(slug)
  if (!event || !event.requestable) {
    return NextResponse.json(
      { error: 'Dit event is niet (meer) aanvraagbaar' },
      { status: 404, headers: corsHeaders },
    )
  }

  const body = await req.json().catch(() => ({}))

  // Spam-check honeypot
  if (body?.botcheck) {
    return NextResponse.json({ ok: true }, { headers: corsHeaders })
  }

  const name = String(body?.name || '').trim()
  const email = String(body?.email || '').trim()
  if (!name || !email) {
    return NextResponse.json(
      { error: 'Naam en email zijn verplicht' },
      { status: 400, headers: corsHeaders },
    )
  }

  // Heel basale email-validatie
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: 'Geldig emailadres invullen' },
      { status: 400, headers: corsHeaders },
    )
  }

  try {
    const request = await createEventRequest({
      eventSlug: event.slug,
      eventName: readableEventName(event),
      name,
      email,
      phone: String(body?.phone || ''),
      message: String(body?.message || ''),
      context: String(body?.context || ''),
    })

    // Mail naar BJAY (mag falen zonder dat de aanvraag faalt).
    sendRequestNotification(request)

    return NextResponse.json(
      { ok: true, requestId: request.id },
      { headers: corsHeaders },
    )
  } catch (err) {
    console.error('request-password POST error:', err)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500, headers: corsHeaders },
    )
  }
}
