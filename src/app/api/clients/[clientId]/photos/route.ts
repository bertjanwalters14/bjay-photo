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

  // Sorteer op public_id ASC. Dat geeft camera-bestandsnaam volgorde
  // (DSC_2031 voor DSC_2032), wat chronologisch klopt bij sequentiele
  // camera-bestanden. Niet beinvloed door upload-quirks van parallel uploads.
  const result = await cloudinary.search
    .expression(`folder:bjay/clients/${clientId}`)
    .sort_by('public_id', 'asc')
    .with_field('context')
    .max_results(500)
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

// DELETE — foto verwijderen (alleen admin). Verwacht body { publicId }.
// publicId moet onder bjay/clients/{clientId}/ vallen om kruis-tenant-fouten
// te voorkomen.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { clientId } = await params
  const body = await req.json()
  const publicId: string | undefined = body?.publicId

  if (!publicId || typeof publicId !== 'string') {
    return NextResponse.json({ error: 'publicId is verplicht' }, { status: 400 })
  }

  // Sanity-check: publicId moet binnen deze client's folder vallen
  const expectedPrefix = `bjay/clients/${clientId}/`
  if (!publicId.startsWith(expectedPrefix)) {
    return NextResponse.json(
      { error: 'publicId hoort niet bij deze klant' },
      { status: 400 }
    )
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId)
    if (result.result !== 'ok' && result.result !== 'not found') {
      return NextResponse.json(
        { error: 'Verwijderen mislukt', detail: result.result },
        { status: 500 }
      )
    }
  } catch (err) {
    console.error('Cloudinary destroy error:', err)
    return NextResponse.json({ error: 'Verwijderen mislukt' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
      )
    }
  } catch (err) {
    console.error('Cloudinary destroy error:', err)
    return NextResponse.json({ error: 'Verwijderen mislukt' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
