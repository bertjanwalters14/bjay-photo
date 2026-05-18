import { NextResponse } from 'next/server'
import cloudinary from '@/lib/cloudinary'
import { getAdminSession } from '@/lib/auth'

// Cloudinary signed upload voor "Meest recente momenten" tegels op de
// homepage. Browser doet direct een upload-call naar Cloudinary met deze
// signature (omzeilt de 4.5MB Vercel function payload-limit). Alleen admin.
export async function POST() {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const timestamp = Math.round(Date.now() / 1000)
  const folder = 'bjay/home/recent'

  const paramsToSign = {
    timestamp,
    folder,
    use_filename: 'true',
    unique_filename: 'true',
  }

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!,
  )

  return NextResponse.json({
    signature,
    timestamp,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  })
}
