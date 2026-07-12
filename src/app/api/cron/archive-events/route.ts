import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import {
  ARCHIVE_AFTER_DAYS,
  WARNING_BEFORE_DAYS,
  archiveClientPhotos,
  getArchivableClients,
  getClientsNeedingWarning,
  markWarningSent,
} from '@/lib/archive'

// Dagelijkse cron. Drie auth-paden (zoals review-cron):
//   1. Vercel Cron: Authorization: Bearer ${CRON_SECRET}
//   2. Externe cron: ?token=XXX
//   3. Admin sessie: handmatige trigger vanuit admin UI

const FROM_ADDRESS = 'Bjay.photo <info@bjay.photo>'
const PHOTOGRAPHER_TO = 'bertjanwalters@gmail.com'

async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, text }),
    })
    return res.ok
  } catch (err) {
    console.error('Mail error:', err)
    return false
  }
}

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const headerOk = Boolean(expected && authHeader === `Bearer ${expected}`)

  const url = new URL(req.url)
  const tokenParam = url.searchParams.get('token')
  const tokenOk = Boolean(expected && tokenParam === expected)

  const isAdmin = await getAdminSession()

  if (!headerOk && !tokenOk && !isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  // Stap 1: stuur waarschuwingsmails voor klanten die op WARNING_BEFORE_DAYS
  // van archivering staan en nog geen mail hebben gehad.
  const needsWarning = await getClientsNeedingWarning()
  const warned: string[] = []
  for (const candidate of needsWarning) {
    const daysLeft = candidate.daysUntilArchive
    const subject = `Heads-up: foto's van "${candidate.client.name}" worden over ${daysLeft} dagen verwijderd`
    const message = [
      `Heads-up over een aankomende auto-archivering.`,
      ``,
      `Event: ${candidate.client.name} (code: ${candidate.client.code})`,
      `Aangemaakt: ${new Date(candidate.client.createdAt).toLocaleDateString('nl-NL')}`,
      `Archiveert op: ${candidate.archiveAt.toLocaleDateString('nl-NL')}`,
      `Verloopt over: ${daysLeft} dagen`,
      ``,
      `Wat er straks gebeurt: alle Cloudinary-foto's van deze klant worden`,
      `definitief verwijderd om opslagkosten te besparen. Likes, feedback`,
      `en bestellingen blijven gewoon staan voor je administratie.`,
      ``,
      `Wil je dit voorkomen? Open de admin en download de foto's nu,`,
      `of verleng de termijn met de "Verleng"-knoppen bij Auto-cleanup.`,
      ``,
      `Admin: https://app.bjay.photo/admin/clients/${candidate.client.code}`,
    ].join('\n')

    const ok = await sendMail(PHOTOGRAPHER_TO, subject, message)
    if (ok) {
      await markWarningSent(candidate.client.code)
      warned.push(candidate.client.name)
    }
  }

  // Stap 2: archiveer klanten die over de termijn zijn (en geen open orders hebben).
  const toArchive = await getArchivableClients()
  const archived: string[] = []
  const failed: string[] = []
  for (const candidate of toArchive) {
    const result = await archiveClientPhotos(candidate.client.code)
    if (result.ok) {
      archived.push(candidate.client.name)
    } else {
      failed.push(`${candidate.client.name}: ${result.error}`)
    }
  }

  // Stap 3: stuur samenvattende mail naar fotograaf als er iets is gedaan.
  if (archived.length > 0 || failed.length > 0) {
    const subject = `Auto-archief: ${archived.length} event(s) opgeruimd`
    const message = [
      `Cleanup-cron heeft gedraaid.`,
      ``,
      `Gearchiveerd (foto's weg uit Cloudinary):`,
      ...(archived.length > 0 ? archived.map(n => `  - ${n}`) : ['  (geen)']),
      ``,
      failed.length > 0 ? `Mislukt:\n${failed.map(f => `  - ${f}`).join('\n')}` : '',
      ``,
      `Likes, feedback en bestellingen blijven bewaard.`,
    ]
      .filter(Boolean)
      .join('\n')
    await sendMail(PHOTOGRAPHER_TO, subject, message)
  }

  return NextResponse.json({
    warned: warned.length,
    warnedNames: warned,
    archived: archived.length,
    archivedNames: archived,
    failed: failed.length,
    failedDetails: failed,
    config: { ARCHIVE_AFTER_DAYS, WARNING_BEFORE_DAYS },
  })
}
