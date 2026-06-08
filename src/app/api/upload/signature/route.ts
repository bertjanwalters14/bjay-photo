import { NextRequest, NextResponse } from 'next/server'
import cloudinary from '@/lib/cloudinary'
import redis from '@/lib/redis'
import { getAdminSession } from '@/lib/auth'
import type { Client } from '@/lib/types'

// Genereert een signed Cloudinary upload-signature. De browser kan vervolgens
// direct naar Cloudinary uploaden, wat de 4.5MB Vercel function payload-limit
// omzeilt. Alleen admin mag een signature opvragen.
export async function POST(req: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const body = await req.json()
  const clientId: string = (body?.clientId || '').toString().trim()
  if (!clientId) {
    return NextResponse.json({ error: 'clientId is verplicht' }, { status: 400 })
  }

  // Heractiveer een eerder gearchiveerde client zodra er nieuwe foto's
  // ge-upload gaan worden. archiveWarningAt ook resetten zodat de cron
  // bij een volgende archief-ronde gewoon weer een warning kan sturen.
  try {
    const client = await redis.get<Client>(`client:${clientId}`)
    if (client && (client.archivedAt || client.archiveWarningAt)) {
      await redis.set(`client:${clientId}`, {
        ...client,
        archivedAt: null,
        archiveWarningAt: null,
      })
    }
  } catch (err) {
    console.error('Unarchive bij upload mislukt:', err)
    // Ga gewoon door, signature mag wel verstrekt worden
  }

  const timestamp = Math.round(Date.now() / 1000)
  const folder = `bjay/clients/${clientId}`

  // Cloudinary verifieert dat browser-uploads exact deze params gebruiken.
  // Browser moet bij upload: file, api_key, timestamp, signature, folder,
  // use_filename, unique_filename, image_metadata meesturen.
  // image_metadata=true zorgt dat Cloudinary de EXIF parseert en bewaart,
  // anders strippen ze 'm standaard. Nodig voor datum/tijdslot-filter.
  const paramsToSign = {
    timestamp,
    folder,
    use_filename: 'true',
    unique_filename: 'true',
    image_metadata: 'true',
  }

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  )

  return NextResponse.json({
    signature,
    timestamp,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  })
}
