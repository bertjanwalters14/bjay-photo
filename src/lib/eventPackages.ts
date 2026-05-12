import type { EventPackage } from './types'

// Prijs-tier: event = volume, lage prijs per foto. Personal = curated, premium prijs.
export type PriceTier = 'event' | 'personal'

interface TierPrices {
  single: number // cents
  pack3: number
  pack5: number
}

const TIER_PRICES: Record<PriceTier, TierPrices> = {
  event: { single: 500, pack3: 1200, pack5: 1800 },
  personal: { single: 1000, pack3: 2500, pack5: 4000 },
}

const UNLIMITED_CENTS = 2500 // legacy: alleen via priceForLegacyPackage

export interface PriceBreakdown {
  priceCents: number
  priceLabel: string
  isUnlimited: boolean
  parts: string[]
  tip?: string
}

function formatEuro(cents: number): string {
  if (cents % 100 === 0) return `€${cents / 100}`
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

// Greedy: pack5 > pack3 > single, vanwege dalende prijs per foto in beide tiers.
export function calculatePriceForCount(n: number, tier: PriceTier = 'event'): PriceBreakdown {
  if (n <= 0) {
    return { priceCents: 0, priceLabel: '€0', isUnlimited: false, parts: [] }
  }

  const prices = TIER_PRICES[tier]

  let remaining = n
  let cents = 0
  const parts: string[] = []

  const pack5 = Math.floor(remaining / 5)
  if (pack5 > 0) {
    cents += pack5 * prices.pack5
    remaining -= pack5 * 5
    parts.push(`${pack5}x pakket van 5 foto's`)
  }

  const pack3 = Math.floor(remaining / 3)
  if (pack3 > 0) {
    cents += pack3 * prices.pack3
    remaining -= pack3 * 3
    parts.push(`${pack3}x pakket van 3 foto's`)
  }

  if (remaining > 0) {
    cents += remaining * prices.single
    parts.push(`${remaining}x losse foto`)
  }

  // Tier-specifieke upsell-tips
  let tip: string | undefined
  if (tier === 'event') {
    if (n === 2) tip = 'Tip: voeg 1 foto toe voor pakket 3 - €12 (extra foto gratis!)'
    if (n === 4) tip = 'Tip: voeg 1 foto toe voor pakket 5 - €18 (5e foto kost slechts €1)'
  } else {
    // personal pricing: pack3 (€50) is duurder dan 2x single (€40), dus n=2 geeft geen tip
    if (n === 4) {
      const extraCost = prices.pack5 - cents
      tip = `Tip: voeg 1 foto toe voor pakket 5 - ${formatEuro(prices.pack5)} (5e foto kost slechts ${formatEuro(extraCost)})`
    }
  }

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

// Backwards-compat voor oude orders (single/pack3/pack5/unlimited)
export function priceForLegacyPackage(
  key: EventPackage,
  tier: PriceTier = 'event'
): PriceBreakdown | null {
  const p = TIER_PRICES[tier]
  switch (key) {
    case 'single':
      return { priceCents: p.single, priceLabel: formatEuro(p.single), isUnlimited: false, parts: ['1 foto'] }
    case 'pack3':
      return { priceCents: p.pack3, priceLabel: formatEuro(p.pack3), isUnlimited: false, parts: ['Pakket van 3 foto\'s'] }
    case 'pack5':
      return { priceCents: p.pack5, priceLabel: formatEuro(p.pack5), isUnlimited: false, parts: ['Pakket van 5 foto\'s'] }
    case 'unlimited':
      return priceForUnlimited()
    default:
      return null
  }
}

// Tarieven-catalogus per tier, voor display in banner / info-paneel
export function priceCatalog(tier: PriceTier = 'event'): { label: string; price: string }[] {
  const p = TIER_PRICES[tier]
  return [
    { label: '1 foto', price: formatEuro(p.single) },
    { label: '3 foto\'s (pakket)', price: formatEuro(p.pack3) },
    { label: '5 foto\'s (pakket)', price: formatEuro(p.pack5) },
  ]
}

// Backwards-compat export — sommige bestanden importeerden de constante
export const PRICE_CATALOG = priceCatalog('event')
