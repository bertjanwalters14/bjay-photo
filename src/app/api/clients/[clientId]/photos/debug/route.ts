import { NextRequest, NextResponse } from 'next/server'
import cloudinary from '@/lib/cloudinary'
import { getAdminSession } from '@/lib/auth'

// DEBUG-endpoint: laat zien wat Cloudinary teruggeeft voor de foto's van
// deze client, inclusief image_metadata (EXIF). Alleen admin, alleen voor
// troubleshooting datum/tijdslot-filter.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Alleen admin' }, { status: 401 })
  }

  const { clientId } = await params
  const result = await cloudinary.search
    .expression(`folder:bjay/clients/${clientId}`)
    .with_field('image_metadata')
    .max_results(20)
    .execute()

  type R = {
    public_id?: string
    created_at?: string
    image_metadata?: Record<string, unknown>
  }

  const summary = (result.resources as R[]).map(r => ({
    publicId: r.public_id,
    cloudinaryCreatedAt: r.created_at,
    hasMetadata: Boolean(r.image_metadata),
    DateTimeOriginal: r.image_metadata?.DateTimeOriginal,
    DateTime: r.image_metadata?.DateTime,
    DateTimeDigitized: r.image_metadata?.DateTimeDigitized,
    metadataKeys: r.image_metadata ? Object.keys(r.image_metadata) : [],
  }))

  return NextResponse.json({ count: summary.length, photos: summary })
}
