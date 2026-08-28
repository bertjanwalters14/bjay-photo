import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { getAdminSession } from '@/lib/auth'
import { createInvoice, getInvoice } from '@/lib/invoices'
import type { Client } from '@/lib/types'

// GET — de factuur die bij deze klant hoort (alleen admin). 404 als er nog
// geen factuur is uitgeschreven.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { clientId } = await params
  const client = await redis.get<Client>(`client:${clientId}`)
  if (!client) {
    return NextResponse.json({ error: 'Klant niet gevonden' }, { status: 404 })
  }
  if (!client.invoiceNumber) {
    return NextResponse.json({ error: 'Nog geen factuur' }, { status: 404 })
  }

  const invoice = await getInvoice(client.invoiceNumber)
  if (!invoice) {
    return NextResponse.json({ error: 'Factuur niet gevonden' }, { status: 404 })
  }

  return NextResponse.json({ invoice })
}

// POST — schrijf een factuur uit voor deze klant (alleen admin). De factuur is
// een momentopname; latere wijzigingen aan de klant raken 'm niet meer.
// Weigert bewust een tweede factuur voor dezelfde klant: dat zou stilletjes
// een gat of dubbeling in je nummering opleveren.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  const { clientId } = await params
  const client = await redis.get<Client>(`client:${clientId}`)
  if (!client) {
    return NextResponse.json({ error: 'Klant niet gevonden' }, { status: 404 })
  }
  if (client.invoiceNumber) {
    return NextResponse.json(
      { error: `Er is al een factuur (${client.invoiceNumber}) voor deze klant` },
      { status: 409 },
    )
  }

  const body = await req.json().catch(() => ({}))

  const description = typeof body?.description === 'string' ? body.description.trim().slice(0, 300) : ''
  if (!description) {
    return NextResponse.json({ error: 'Omschrijving is verplicht' }, { status: 400 })
  }

  const amount = typeof body?.amount === 'number' ? body.amount : NaN
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Vul een bedrag groter dan nul in' }, { status: 400 })
  }

  const invoiceDate = typeof body?.invoiceDate === 'string' ? body.invoiceDate.trim() : undefined

  const invoice = await createInvoice({
    client,
    description,
    amount: Math.round(amount * 100) / 100,
    invoiceDate,
  })

  // Backlink op de klant zodat de klantpagina weet dat er een factuur ligt.
  const updated: Client = { ...client, invoiceNumber: invoice.number }
  await redis.set(`client:${clientId}`, updated)

  return NextResponse.json({ invoice, client: updated })
}
