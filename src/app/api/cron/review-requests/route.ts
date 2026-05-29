import { NextRequest, NextResponse } from 'next/server'
import {
  getPendingReviewRequests,
  markReviewRequested,
  sendReviewRequest,
} from '@/lib/reviews'
import { getAdminSession } from '@/lib/auth'

// Dagelijkse cron-endpoint. Drie manieren om aan te roepen:
//   1. Vercel Cron (automatisch, via vercel.json): stuurt
//      "Authorization: Bearer ${CRON_SECRET}" header.
//   2. Externe cron-service (cron-job.org etc.): GET met ?token=XXX in URL.
//   3. Admin handmatig vanaf /admin/reviews: ingelogde admin-sessie.
//
// Werkwijze: alle klanten met deliveredAt > 3 dagen en zonder reviewRequestedAt
// krijgen een review-vraag. Bij succes wordt reviewRequestedAt op nu gezet.

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET

  // Auth 1: Authorization header (Vercel Cron stuurt deze automatisch)
  const authHeader = req.headers.get('authorization')
  const headerOk = Boolean(expected && authHeader === `Bearer ${expected}`)

  // Auth 2: ?token=... in URL (externe cron-services)
  const url = new URL(req.url)
  const tokenParam = url.searchParams.get('token')
  const tokenOk = Boolean(expected && tokenParam === expected)

  // Auth 3: admin sessie (handmatige trigger vanuit admin UI)
  const isAdmin = await getAdminSession()

  if (!headerOk && !tokenOk && !isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const pending = await getPendingReviewRequests()
  if (pending.length === 0) {
    return NextResponse.json({ processed: 0, message: 'Geen review-vragen nodig vandaag.' })
  }

  let sent = 0
  let failed = 0
  const results: Array<{ name: string; ok: boolean }> = []

  for (const client of pending) {
    const ok = await sendReviewRequest(client)
    if (ok) {
      await markReviewRequested(client.code)
      sent++
    } else {
      failed++
    }
    results.push({ name: client.name, ok })
  }

  return NextResponse.json({
    processed: pending.length,
    sent,
    failed,
    results,
  })
}
