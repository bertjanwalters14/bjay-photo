import { NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { getAdminSession } from '@/lib/auth'
import { listInvoices } from '@/lib/invoices'
import type { Client } from '@/lib/types'

// GET — alle facturen, nieuwste bovenaan (alleen admin). Per factuur wordt de
// betaal-status van de bijbehorende klant meegestuurd; die blijft leidend
// (Client.paidAt voedt ook het omzet-overzicht), de factuur zelf houdt daar
// bewust geen eigen status voor bij.
export async function GET() {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const invoices = await listInvoices()
  if (!invoices.length) {
    return NextResponse.json({ invoices: [] })
  }

  // Betaal-status per klant erbij (één lookup per unieke klantcode).
  const codes = Array.from(new Set(invoices.map(i => i.clientCode)))
  const clients = await Promise.all(codes.map(code => redis.get<Client>(`client:${code}`)))
  const paidByCode = new Map<string, string | null>()
  codes.forEach((code, i) => paidByCode.set(code, clients[i]?.paidAt ?? null))

  return NextResponse.json({
    invoices: invoices.map(invoice => ({
      ...invoice,
      paidAt: paidByCode.get(invoice.clientCode) ?? null,
    })),
  })
}
