import { NextRequest, NextResponse } from 'next/server'
import cloudinary from '@/lib/cloudinary'
import { getAdminSession } from '@/lib/auth'

// Verhaal-export: geeft voor een selectie foto's de download-URLs terug
// (webp, max 2000px, kwaliteit 82 — zelfde specs als optimize-photos.py op
// de website) plus het gallery-snippet voor de verhaal-pagina. De browser
// downloadt de foto's zelf rechtstreeks bij Cloudinary en bouwt daar de zip
// (Vercel responses zijn gelimiteerd tot 4,5 MB, dus server-side zippen kan
// niet). Geen watermerk: dit is voor bjay.photo zelf.

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

// "feest-harkstede-2026-01" -> "Feest harkstede 2026 01" (zelfde als
// humanize() in optimize-photos.py)
function humanize(stem: string): string {
  const text = stem.replace(/[_ ]/g, '-').replace(/-/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { clientId } = await params
  const body = await req.json().catch(() => null)
  const publicIds: unknown = body?.publicIds
  const slug: unknown = body?.slug

  if (!Array.isArray(publicIds) || publicIds.length === 0 || !publicIds.every(p => typeof p === 'string')) {
    return NextResponse.json({ error: 'publicIds is verplicht' }, { status: 400 })
  }
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: 'Slug mag alleen kleine letters, cijfers en hyphens bevatten (bv. feest-harkstede-2026)' },
      { status: 400 }
    )
  }

  // Sanity-check: alle publicIds moeten binnen deze client's folder vallen
  const expectedPrefix = `bjay/clients/${clientId}/`
  if (!publicIds.every(p => (p as string).startsWith(expectedPrefix))) {
    return NextResponse.json(
      { error: 'Een of meer publicIds horen niet bij deze klant' },
      { status: 400 }
    )
  }

  const files = (publicIds as string[]).map((publicId, i) => {
    const filename = `${slug}-${String(i + 1).padStart(2, '0')}.webp`
    return {
      publicId,
      filename,
      alt: humanize(filename.replace(/\.webp$/, '')),
      // Zelfde maat/kwaliteit als de website-tool: max 2000px breed, q82
      url: cloudinary.url(publicId, {
        secure: true,
        transformation: [{ width: 2000, crop: 'limit', quality: 82, fetch_format: 'webp' }],
      }),
    }
  })

  // HTML-snippet in exact het formaat van optimize-photos.py, zodat het
  // 1-op-1 in een verhaal-pagina geplakt kan worden.
  const htmlLines = files.map(
    f =>
      `        <div class="photo-wrap"><img src="../images/verhalen/${slug}/${f.filename}" alt="${f.alt}" loading="lazy" /></div>`
  )
  const snippet =
    '<!-- HTML snippet voor in je verhaal-pagina -->\n' +
    '<!-- Vervang het bestaande <div class="masonry">...</div> blok in je verhaal hiermee -->\n\n' +
    '      <div class="masonry">\n' +
    htmlLines.join('\n') +
    '\n      </div>\n'

  return NextResponse.json({ files, snippet })
}
