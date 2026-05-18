import { NextRequest, NextResponse } from 'next/server'
import { getRecentPhotos, setRecentPhotos } from '@/lib/recentPhotos'
import { getAdminSession } from '@/lib/auth'
import type { RecentPhoto } from '@/lib/types'

// Publieke endpoint die de homepage van bjay.photo aanroept om de "Meest
// recente momenten" tegels op te halen. GET = publiek met CORS, PUT = admin.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET() {
  try {
    const photos = await getRecentPhotos()
    return NextResponse.json({ photos }, { headers: corsHeaders })
  } catch (err) {
    console.error('recent GET error:', err)
    return NextResponse.json(
      { photos: [], error: 'Server error' },
      { status: 500, headers: corsHeaders },
    )
  }
}

export async function PUT(req: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const photos: RecentPhoto[] = Array.isArray(body?.photos) ? body.photos : []
    await setRecentPhotos(photos)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('recent PUT error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
