import { NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { getAdminSession } from '@/lib/auth'
import { parsePrice } from '@/lib/format'
import type { Client, Order } from '@/lib/types'

// Omzet-overzicht (alleen admin). Telt uitsluitend ECHT ontvangen geld:
//   - Event/print-orders met status 'paid' of 'shipped' (verzonden = al betaald)
//   - Personal shoots met een ingevuld bedrag (price) en gezette paidAt
// Maand-indeling: orders op besteldatum (createdAt), personal op paidAt.

interface MonthBucket {
  month: string // 'YYYY-MM'
  orders: number
  personal: number
  total: number
}

function monthKey(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function GET() {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Niet toegestaan' }, { status: 401 })
  }

  // --- Orders ophalen ---
  const orderIds = await redis.lrange<string>('orders:all', 0, -1)
  const orders = orderIds.length
    ? (await Promise.all(orderIds.map(id => redis.get<Order>(`order:${id}`)))).filter(
        (o): o is Order => Boolean(o)
      )
    : []

  // --- Klanten ophalen ---
  const codes = await redis.smembers('clients:all')
  const clients = codes.length
    ? (await Promise.all(codes.map(code => redis.get<Client>(`client:${code}`)))).filter(
        (c): c is Client => Boolean(c)
      )
    : []

  const months = new Map<string, MonthBucket>()
  function bucket(key: string): MonthBucket {
    let b = months.get(key)
    if (!b) {
      b = { month: key, orders: 0, personal: 0, total: 0 }
      months.set(key, b)
    }
    return b
  }

  const currentYear = String(new Date().getFullYear())
  let totalThisYear = 0

  // Orders: alleen betaald of verzonden tellen als ontvangen.
  let ordersTotal = 0
  let ordersCount = 0
  for (const o of orders) {
    if (o.status !== 'paid' && o.status !== 'shipped') continue
    const amount = parsePrice(o.price)
    ordersTotal += amount
    ordersCount += 1
    const key = monthKey(o.createdAt)
    if (key) {
      bucket(key).orders += amount
      bucket(key).total += amount
      if (key.startsWith(currentYear)) totalThisYear += amount
    }
  }

  // Personal shoots: bedrag ingevuld + als betaald gemarkeerd.
  let personalTotal = 0
  let personalCount = 0
  // Openstaand = personal met bedrag maar nog niet betaald (informatief).
  let outstandingTotal = 0
  const outstandingItems: { code: string; name: string; amount: number }[] = []
  for (const c of clients) {
    if (c.type !== 'personal') continue
    const amount = parsePrice(c.price)
    if (amount <= 0) continue
    if (c.paidAt) {
      personalTotal += amount
      personalCount += 1
      const key = monthKey(c.paidAt)
      if (key) {
        bucket(key).personal += amount
        bucket(key).total += amount
        if (key.startsWith(currentYear)) totalThisYear += amount
      }
    } else {
      outstandingTotal += amount
      outstandingItems.push({ code: c.code, name: c.name, amount })
    }
  }
  // Hoogste openstaande bedrag bovenaan.
  outstandingItems.sort((a, b) => b.amount - a.amount)

  const byMonth = Array.from(months.values()).sort((a, b) => b.month.localeCompare(a.month))

  return NextResponse.json({
    total: ordersTotal + personalTotal,
    totalThisYear,
    orders: { total: ordersTotal, count: ordersCount },
    personal: { total: personalTotal, count: personalCount },
    outstanding: { total: outstandingTotal, count: outstandingItems.length, items: outstandingItems },
    byMonth,
  })
}
