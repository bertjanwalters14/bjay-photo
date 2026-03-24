import { NextRequest, NextResponse } from 'next/server'
import cloudinary from '@/lib/cloudinary'
import { getClientSession, getAdminSession } from '@/lib/auth'
import { Photo } from '@/lib/types'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params

  const clientCode = await getClientSession()
  const isAdmin = await getAdminSession()

  if (!isAdmin && clientCode !== clientId) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const result = await cloudinary.search
    .expression(`folder:bjay/clients/${clientId}`)
    .sort_by('created_at', 'desc')
    .with_field('context')
    .max_results(100)
    .execute()

  const photos: Photo[] = result.resources.map((r: any) => ({
    publicId: r.public_id,
    url: r.secure_url,
    thumbnail: cloudinary.url(r.public_id, {
      width: 400,
      crop: 'scale',
      quality: 'auto',
      fetch_format: 'auto',
    }),
    width: r.width,
    height: r.height,
    createdAt: r.created_at,
  }))

  return NextResponse.json({ photos })
}