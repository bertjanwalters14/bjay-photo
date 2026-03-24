import { NextRequest, NextResponse } from 'next/server'
import cloudinary from '@/lib/cloudinary'
import { getAdminSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File
  const clientId = formData.get('clientId') as string

  if (!file || !clientId) {
    return NextResponse.json({ error: 'Bestand en clientId zijn verplicht' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: `bjay/clients/${clientId}`,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    ).end(buffer)
  })

  return NextResponse.json({ success: true, result })
}