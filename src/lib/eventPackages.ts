// Prijs-tier: event = volume, lage prijs per foto. Personal = curated, premium prijs.
export type PriceTier = 'event' | 'personal'

// Marginale prijs (cents) van de i-de foto (1-based). Aflopend, zodat de prijs
// per foto altijd daalt naarmate je er meer kiest - geen knikken meer.
//   event:    foto 1 €5, foto 2 €4, foto 3 t/m 7 €3, vanaf foto 8 €2
//   personal: foto 1 €10, foto 2 €8, foto 3 t/m 5 €7, vanaf foto 6 €6
const TIER_RATE: Record<PriceTier, (i: number) => number> = {
  event: (i) => (i === 1 ? 500 : i === 2 ? 400 : i <= 7 ? 300 : 200),
  personal: (i) => (i === 1 ? 1000 : i === 2 ? 800 : i <= 5 ? 700 : 600),
}

const UNLIMITED_CENTS = 2500 // legacy: alleen via priceForUnlimited

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

// Telt de marginale prijs per foto op. Elke volgende foto is even duur of
// goedkoper dan de vorige, dus de gemiddelde prijs per foto daalt netjes.
export function calculatePriceForCount(n: number, tier: PriceTier = 'event'): PriceBreakdown {
  if (n <= 0) {
    return { priceCents: 0, priceLabel: '€0', isUnlimited: false, parts: [] }
  }

  const rate = TIER_RATE[tier]
  let cents = 0
  for (let i = 1; i <= n; i++) cents += rate(i)

  // Kleine value-hint: gemiddelde prijs per foto (alleen bij meer dan 1)
  const parts = n > 1 ? [`gemiddeld ${formatEuro(Math.round(cents / n))} per foto`] : []

  // Zachte volume-nudge richting de goedkopere tier
  let tip: string | undefined
  if (tier === 'event' && n >= 3 && n < 8) {
    tip = "Vanaf 8 foto's betaal je nog maar €2 per foto."
  } else if (tier === 'personal' && n >= 3 && n < 6) {
    tip = "Vanaf 6 foto's is elke extra foto €6."
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

// Een paar voorbeeldpunten voor het "hoe werkt de prijs"-paneel, zodat de
// klant ziet dat meer kiezen loont.
export function priceCatalog(tier: PriceTier = 'event'): { label: string; price: string }[] {
  const examples = tier === 'event' ? [1, 3, 5, 8] : [1, 3, 5]
  return examples.map(n => ({
    label: `${n} foto${n !== 1 ? "'s" : ''}`,
    price: calculatePriceForCount(n, tier).priceLabel,
  }))
}

// Eén regel die de prijsopbouw uitlegt (tier-afhankelijk).
export function priceRule(tier: PriceTier = 'event'): string {
  return tier === 'event'
    ? "Hoe meer foto's je kiest, hoe goedkoper per foto. Vanaf 8 foto's nog maar €2 per stuk."
    : "Hoe meer foto's je kiest, hoe goedkoper per foto."
}

// Backwards-compat export — sommige bestanden importeerden de constante
export const PRICE_CATALOG = priceCatalog('event')
