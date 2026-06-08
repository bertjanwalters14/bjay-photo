import { NextRequest, NextResponse } from 'next/server'
import cloudinary from '@/lib/cloudinary'
import redis from '@/lib/redis'
import { getAdminSession, getClientOrPreviewSession } from '@/lib/auth'
import { Photo, type Client } from '@/lib/types'

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

  // Bepaal portal-type: bij Personal mag de klant hoger-resolutie zien
  // (ze hebben de shoot al betaald). Bij Event is het preview-kwaliteit
  // tot er afgerekend is.
  const client = await redis.get<Client>(`client:${clientId}`)
  const isPersonal = client?.type === 'personal'

  // Als de client gearchiveerd is (auto-cleanup voor events na 30d), geven
  // we een lege lijst terug met een archived-flag zodat de gallery netjes
  // kan tonen "foto's zijn niet meer beschikbaar".
  if (client?.archivedAt) {
    return NextResponse.json({ photos: [], archived: true, archivedAt: client.archivedAt })
  }

  // Resolutie-preset per type. Watermerk blijft op beide (branding).
  // Y-offset schaalt mee met de breedte zodat het watermerk visueel
  // op dezelfde plek staat.
  const PREVIEW_WIDTH = isPersonal ? 2000 : 1200
  const THUMB_WIDTH = isPersonal ? 800 : 600
  const PREVIEW_Y = isPersonal ? 83 : 50
  const THUMB_Y = isPersonal ? 33 : 25

  type CloudinaryResource = {
    public_id: string
    secure_url: string
    width: number
    height: number
    created_at: string
    display_name?: string
    filename?: string
  }

  // We vragen display_name op (Cloudinary's veld voor de originele
  // bestandsnaam wanneer use_filename: true gebruikt is). Dat is veel
  // betrouwbaarder dan het strippen van de _xyz suffix uit de public_id.
  const result = await cloudinary.search
    .expression(`folder:bjay/clients/${clientId}`)
    .sort_by('public_id', 'asc')
    .with_field('context')
    .max_results(500)
    .execute()

  type PhotoWithSortKey = Photo & { _sortKey: string }

  // Bepaal sorteer-key per foto. Prioriteit:
  // 1. display_name (originele upload-naam, bv. "DSC_2031")
  // 2. filename veld als display_name niet beschikbaar is
  // 3. public_id basename met _xyz suffix gestript als laatste vangnet
  function sortKeyFor(r: CloudinaryResource): string {
    if (r.display_name && r.display_name.trim()) return r.display_name.trim()
    if (r.filename && r.filename.trim()) return r.filename.trim()
    const base = r.public_id.split('/').pop() || ''
    return base.replace(/_[a-z0-9]{4,10}$/i, '')
  }

  const photosWithKeys: PhotoWithSortKey[] = (result.resources as CloudinaryResource[]).map(r => ({
    publicId: r.public_id,
    // Gallery preview (modal-grootte) + grid thumbnail. Personal portals
    // krijgen hogere resolutie omdat de klant de shoot al heeft betaald
    // en mooi groot wil kunnen kijken op het portaal.
    url: watermarkedUrl(r.public_id, PREVIEW_WIDTH, PREVIEW_Y),
    thumbnail: watermarkedUrl(r.public_id, THUMB_WIDTH, THUMB_Y),
    width: r.width,
    height: r.height,
    createdAt: r.created_at,
    _sortKey: sortKeyFor(r),
  }))

  // Natural sort: DSC_2 voor DSC_10. Op de sleutel die zo dicht mogelijk
  // bij de originele camera-bestandsnaam ligt.
  photosWithKeys.sort((a, b) =>
    a._sortKey.localeCompare(b._sortKey, 'nl', { numeric: true, sensitivity: 'base' })
  )

  // Strip de interne _sortKey weg voordat we naar de client sturen.
  const photos: Photo[] = photosWithKeys.map(({ _sortKey, ...rest }) => {
    void _sortKey
    return rest
  })

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
