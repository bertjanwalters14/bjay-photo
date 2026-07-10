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

// Schone (niet-gewatermerkte) URL op displaygrootte, voor personal-galerijen.
function cleanUrl(publicId: string, width: number) {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [{ width, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
  })
}

// Schone download op volledige resolutie, geforceerd als download (attachment).
function originalDownloadUrl(publicId: string) {
  return cloudinary.url(publicId, { secure: true, flags: 'attachment' })
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

  // Gelinkte foto-bron: toon de map van een andere client (zie types.ts).
  // Zo hoef je bv. voor een commissie-album niet apart te uploaden.
  const sourceFolderId = client?.photoSourceClientId || clientId

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
    image_metadata?: {
      DateTimeOriginal?: string  // EXIF: tijdstip waarop foto is genomen
      DateTime?: string          // EXIF: laatste wijziging van bestand
    }
  }

  // We vragen display_name + image_metadata op. image_metadata bevat de EXIF
  // van de foto, waaronder DateTimeOriginal (de echte opname-datum). Zonder
  // dit veld zou de datum-filter in de gallery alleen op upload-tijd werken,
  // wat nutteloos is bij events die over meerdere dagen lopen maar in 1 batch
  // ge-upload worden.
  //
  // 500 is het maximum dat Cloudinary's Search API per aanroep toestaat, dus
  // we blijven doorpagineren met next_cursor tot alles is opgehaald. Zonder
  // deze loop werden foto's boven de 500 stilletjes niet getoond.
  const resources: CloudinaryResource[] = []
  let cursor: string | undefined
  do {
    const page = await cloudinary.search
      .expression(`folder:bjay/clients/${sourceFolderId}`)
      .sort_by('public_id', 'asc')
      .with_field('context')
      .with_field('image_metadata')
      .max_results(500)
      .next_cursor(cursor)
      .execute()
    resources.push(...(page.resources as CloudinaryResource[]))
    cursor = page.next_cursor
  } while (cursor)

  // EXIF DateTimeOriginal heeft format "YYYY:MM:DD HH:MM:SS" (kolons als
  // datum-scheider, anders dan ISO). Converteer naar ISO of geef null bij
  // onbekende vorm.
  function parseExifDate(raw: string | undefined): string | null {
    if (!raw) return null
    const m = raw.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/)
    if (!m) return null
    return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`
  }

  // Bepaal de "echte" datum van een foto. Prioriteit:
  // 1. EXIF DateTimeOriginal (camera-tijdstip, ideaal)
  // 2. EXIF DateTime (file mtime, soms gelijk aan opname)
  // 3. Cloudinary upload-tijd (laatste vangnet)
  function photoDateFor(r: CloudinaryResource): string {
    return (
      parseExifDate(r.image_metadata?.DateTimeOriginal) ||
      parseExifDate(r.image_metadata?.DateTime) ||
      r.created_at
    )
  }

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

  const photosWithKeys: PhotoWithSortKey[] = resources.map(r => ({
    publicId: r.public_id,
    // Personal: schone foto's (geen watermerk) op displaygrootte + een schone
    // download op volle resolutie. Event: gewatermerkte preview, geen download.
    url: isPersonal
      ? cleanUrl(r.public_id, PREVIEW_WIDTH)
      : watermarkedUrl(r.public_id, PREVIEW_WIDTH, PREVIEW_Y),
    thumbnail: isPersonal
      ? cleanUrl(r.public_id, THUMB_WIDTH)
      : watermarkedUrl(r.public_id, THUMB_WIDTH, THUMB_Y),
    downloadUrl: isPersonal ? originalDownloadUrl(r.public_id) : undefined,
    width: r.width,
    height: r.height,
    // createdAt = de "echte" opname-datum uit EXIF, met upload-tijd als fallback.
    // Cruciaal voor de datum-filter bij meerdaagse events.
    createdAt: photoDateFor(r),
    _sortKey: sortKeyFor(r),
  }))

  // Personal: chronologisch op opnamedatum (EXIF), zodat een shoot over
  // meerdere dagen als één doorlopend geheel getoond wordt (geen datum-filter).
  // Bestandsnaam als tiebreaker bij gelijke/ontbrekende tijd.
  // Event: natural sort op bestandsnaam (DSC_2 voor DSC_10), zodat de datum-
  // filter de dagen kan opsplitsen.
  if (isPersonal) {
    photosWithKeys.sort((a, b) => {
      const byDate = a.createdAt.localeCompare(b.createdAt)
      if (byDate !== 0) return byDate
      return a._sortKey.localeCompare(b._sortKey, 'nl', { numeric: true, sensitivity: 'base' })
    })
  } else {
    photosWithKeys.sort((a, b) =>
      a._sortKey.localeCompare(b._sortKey, 'nl', { numeric: true, sensitivity: 'base' })
    )
  }

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
