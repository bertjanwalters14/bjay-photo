import type { EventPackage } from './types'

// Bundel-prijzen (in centen). Greedy: pack5 (€3.60/foto) < pack3 (€4/foto) < single (€5/foto).
const PACK5_CENTS = 1800
const PACK3_CENTS = 1200
const SINGLE_CENTS = 500
const UNLIMITED_CENTS = 2500

export interface PriceBreakdown {
  priceCents: number
  priceLabel: string // "€18"
  isUnlimited: boolean
  parts: string[] // bv. ["pakket 5 foto's", "1 losse foto"]
  // Tip die in UI getoond kan worden voor upsell/best-deal
  tip?: string
}

function formatEuro(cents: number): string {
  if (cents % 100 === 0) return `€${cents / 100}`
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

// Bereken goedkoopste prijs voor N foto's (greedy + vergelijk met onbeperkt)
export function calculatePriceForCount(n: number): PriceBreakdown {
  if (n <= 0) {
    return { priceCents: 0, priceLabel: '€0', isUnlimited: false, parts: [] }
  }

  let remaining = n
  let cents = 0
  const parts: string[] = []

  const pack5 = Math.floor(remaining / 5)
  if (pack5 > 0) {
    cents += pack5 * PACK5_CENTS
    remaining -= pack5 * 5
    parts.push(`${pack5}x pakket van 5 foto's`)
  }

  const pack3 = Math.floor(remaining / 3)
  if (pack3 > 0) {
    cents += pack3 * PACK3_CENTS
    remaining -= pack3 * 3
    parts.push(`${pack3}x pakket van 3 foto's`)
  }

  if (remaining > 0) {
    cents += remaining * SINGLE_CENTS
    parts.push(`${remaining}x losse foto`)
  }

  // Upsell-tip: extra foto er bij voor (bijna) gratis?
  let tip: string | undefined
  if (n === 2) tip = 'Tip: voeg 1 foto toe voor pakket 3 - €12 (i.p.v. €10 + €2 = €12, dus extra foto gratis!)'
  if (n === 4) tip = 'Tip: voeg 1 foto toe voor pakket 5 - €18 (5e foto kost slechts €1)'

  return {
    priceCents: cents,
    priceLabel: formatEuro(cents),
    isUnlimited: false,
    parts,
    tip,
  }
}

export function priceForUnlimited(): PriceBreakdown {
  return {
    priceCents: UNLIMITED_CENTS,
    priceLabel: formatEuro(UNLIMITED_CENTS),
    isUnlimited: true,
    parts: ['Onbeperkt pakket - alle foto\'s'],
  }
}

// Voor backwards-compat met oude orders (single/pack3/pack5)
export function priceForLegacyPackage(key: EventPackage): PriceBreakdown | null {
  switch (key) {
    case 'single':
      return { priceCents: SINGLE_CENTS, priceLabel: formatEuro(SINGLE_CENTS), isUnlimited: false, parts: ['1 foto'] }
    case 'pack3':
      return { priceCents: PACK3_CENTS, priceLabel: formatEuro(PACK3_CENTS), isUnlimited: false, parts: ['Pakket van 3 foto\'s'] }
    case 'pack5':
      return { priceCents: PACK5_CENTS, priceLabel: formatEuro(PACK5_CENTS), isUnlimited: false, parts: ['Pakket van 5 foto\'s'] }
    case 'unlimited':
      return priceForUnlimited()
    default:
      return null
  }
}

// Tarieven catalogus voor display in UI ("zo werkt het")
export const PRICE_CATALOG = [
  { label: '1 foto', price: formatEuro(SINGLE_CENTS) },
  { label: '3 foto\'s (pakket)', price: formatEuro(PACK3_CENTS) },
  { label: '5 foto\'s (pakket)', price: formatEuro(PACK5_CENTS) },
]
