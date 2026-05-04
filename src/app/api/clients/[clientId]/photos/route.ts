import { NextRequest, NextResponse } from 'next/server'
import cloudinary from '@/lib/cloudinary'
import { getAdminSession, getClientOrPreviewSession } from '@/lib/auth'
import { Photo } from '@/lib/types'

const WATERMARK_PUBLIC_ID = 'watermerk_vir9aa'

// Cloudinary URL met watermerk-overlay onderaan gecentreerd
function watermarkedUrl(publicId: string, width: number, yOffset: number) {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { width, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
      {
        overlay: WATERMARK_PUBLIC_ID,
        width: 0.3,
        flags: 'relative',
        gravity: 'south',
        y: yOffset,
      },
    ],
  })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params

  const isAdmin = await getAdminSession()
  const clientCode = await getClientOrPreviewSession(req)

  if (!isAdmin && clientCode !== clientId) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  type CloudinaryResource = {
    public_id: string
    secure_url: string
    width: number
    height: number
    created_at: string
  }

  const result = await cloudinary.search
    .expression(`folder:bjay/clients/${clientId}`)
    .sort_by('created_at', 'desc')
    .with_field('context')
    .max_results(100)
    .execute()

  const photos: Photo[] = (result.resources as CloudinaryResource[]).map(r => ({
    publicId: r.public_id,
    // Gallery preview (modal-grootte): 1200px breed met watermerk
    url: watermarkedUrl(r.public_id, 1200, 50),
    // Grid thumbnail: 600px breed met watermerk (kleinere y-offset)
    thumbnail: watermarkedUrl(r.public_id, 600, 25),
    width: r.width,
    height: r.height,
    createdAt: r.created_at,
  }))

  return NextResponse.json({ photos })
}
