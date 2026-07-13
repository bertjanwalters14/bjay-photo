import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import cloudinary from '@/lib/cloudinary'
import { getAdminSession } from '@/lib/auth'
import type { Client } from '@/lib/types'

// POST — wijzig de code (= inlogwachtwoord) van een klant. Alleen admin.
//
// De code is geen los veld, het is de sleutel waarmee alles is opgeslagen
// (Redis-keys + Cloudinary-mapnaam). Om dit veilig te houden zonder een
// volledige foto-migratie te bouwen, weigert deze route als de klant zelf
// foto's in Cloudinary heeft staan (dus geen photoSourceClientId-koppeling
// met eigen upload). Voor klanten zoals de commissie, die foto's via een
// gelinkte bron tonen, is er niets om te verhuizen en is dit veilig.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { clientId } = await params
  const body = await req.json()
  const newCode = (body?.newCode || '').toString().trim().toLowerCase()

  if (!/^[a-z0-9-]{2,60}$/.test(newCode)) {
    return NextResponse.json(
      { error: 'Ongeldige code (alleen kleine letters, cijfers en streepjes, 2-60 tekens)' },
      { status: 400 },
    )
  }
  if (newCode === clientId) {
    return NextResponse.json({ error: 'Dit is al de huidige code' }, { status: 400 })
  }

  const client = await redis.get<Client>(`client:${clientId}`)
  if (!client) {
    return NextResponse.json({ error: 'Klant niet gevonden' }, { status: 404 })
  }

  const targetExists = await redis.exists(`client:${newCode}`)
  if (targetExists) {
    return NextResponse.json({ error: 'Deze code is al in gebruik' }, { status: 400 })
  }

  // Veiligheidscheck: eigen Cloudinary-map moet leeg zijn. Foto's die via
  // photoSourceClientId gelinkt zijn, staan niet in deze map en blokkeren dus niet.
  try {
    const check = await cloudinary.search
      .expression(`folder:bjay/clients/${clientId}`)
      .max_results(1)
      .execute()
    if ((check.total_count || 0) > 0) {
      return NextResponse.json(
        {
          error:
            'Deze klant heeft eigen foto\'s in Cloudinary. Code wijzigen is nu alleen veilig voor klanten zonder eigen foto\'s (bv. via een gelinkte bron).',
        },
        { status: 400 },
      )
    }
  } catch (err) {
    console.error('Cloudinary check bij rename mislukt:', err)
    return NextResponse.json({ error: 'Kon Cloudinary niet controleren, probeer later opnieuw' }, { status: 500 })
  }

  // Alle Redis-keys van deze klant verhuizen. renamenx i.p.v. rename: faalt
  // (silent, "0") als de nieuwe key al bestaat, in plaats van 'm te overschrijven.
  const suffixes = ['', ':cover', ':favorites', ':feedback', ':likes', ':lastVisit', ':visitCount', ':downloads']
  const moved: string[] = []
  try {
    for (const suffix of suffixes) {
      const oldKey = `client:${clientId}${suffix}`
      const newKey = `client:${newCode}${suffix}`
      if (await redis.exists(oldKey)) {
        await redis.renamenx(oldKey, newKey)
        moved.push(suffix)
      }
    }

    await redis.srem('clients:all', clientId)
    await redis.sadd('clients:all', newCode)

    // code-veld in het verhuisde record zelf ook bijwerken.
    const updated = await redis.get<Client>(`client:${newCode}`)
    if (updated) {
      await redis.set(`client:${newCode}`, { ...updated, code: newCode })
    }
  } catch (err) {
    console.error('Rename mislukt halverwege voor', clientId, '->', newCode, 'na', moved, err)
    return NextResponse.json(
      { error: 'Verhuizen deels mislukt, controleer de database. Neem de foutmelding over aan de ontwikkelaar.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true, newCode })
}
