import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { getAdminSession } from '@/lib/auth'
import { getInvoice } from '@/lib/invoices'
import type { Client } from '@/lib/types'

// GET — één factuur op nummer (alleen admin), inclusief de betaal-status van
// de bijbehorende klant zodat de factuurpagina 'betaald' kan tonen.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { number } = await params
  const invoice = await getInvoice(number)
  if (!invoice) {
    return NextResponse.json({ error: 'Factuur niet gevonden' }, { status: 404 })
  }

  const client = await redis.get<Client>(`client:${invoice.clientCode}`)

  return NextResponse.json({ invoice, paidAt: client?.paidAt ?? null })
}
