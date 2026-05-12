import { NextResponse } from 'next/server'
import { getPopupEvent } from '@/lib/events'

// Backwards-compat endpoint voor de popup op bjay.photo.
// Leest uit de nieuwe events-collectie en geeft de huidige popup-event terug.
// Beheer gebeurt via /api/events (admin).

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
    const event = await getPopupEvent()
    if (!event) {
      return NextResponse.json({ active: false }, { headers: corsHeaders })
    }

    return NextResponse.json(
      {
        active: true,
        label: event.label,
        name: event.name,
        description: event.description,
        password: event.password,
        loginUrl: event.loginUrl,
        dismissKey: event.dismissKey,
      },
      { headers: corsHeaders },
    )
  } catch (err) {
    console.error('active-event GET error:', err)
    return NextResponse.json(
      { active: false, error: 'Server error' },
      { status: 500, headers: corsHeaders },
    )
  }
}
