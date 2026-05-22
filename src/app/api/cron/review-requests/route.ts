import { NextRequest, NextResponse } from 'next/server'
import {
  getPendingReviewRequests,
  markReviewRequested,
  sendReviewRequest,
} from '@/lib/reviews'

// Dagelijkse cron-endpoint. Wordt aangeroepen door cron-job.org (of een
// vergelijkbare gratis service) met:
//   GET https://app.bjay.photo/api/cron/review-requests?token=XXX
//
// Token wordt vergeleken met env var CRON_SECRET. Zonder match: 401.
//
// Werkwijze: alle klanten met deliveredAt > 3 dagen en zonder reviewRequestedAt
// krijgen een review-vraag. Bij succes wordt reviewRequestedAt op nu gezet.

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  const expected = process.env.CRON_SECRET

  if (!expected || token !== expected) {
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
