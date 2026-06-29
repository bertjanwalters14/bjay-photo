// Maakt van een ruwe bedrag-invoer een nette weergave. De admin typt alleen
// het getal ("200" of "199,50"); het euroteken en de ",-" komen hier vandaan.
//   "200"     -> "€200,-"
//   "€200,-"  -> "€200,-"   (idempotent)
//   "199,50"  -> "€199,50"
//   "199.5"   -> "€199,50"
//   ""        -> ""         (geen betaalregel)
export function formatPrice(raw: string | undefined | null): string {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return ''
  // Alleen cijfers, komma's en punten overhouden (euroteken, spaties, "-" weg).
  const digits = trimmed.replace(/[^\d.,]/g, '')
  if (!digits) return ''
  // Centen = een komma/punt gevolgd door 1-2 cijfers aan het einde.
  const cents = digits.match(/[.,](\d{1,2})$/)
  if (cents && cents.index !== undefined) {
    const whole = digits.slice(0, cents.index).replace(/[.,]/g, '') || '0'
    return `€${whole},${cents[1].padEnd(2, '0')}`
  }
  return `€${digits.replace(/[.,]/g, '')},-`
}

// Maakt van een opgeslagen bedrag-tekst een getal in euro's, zodat bedragen
// opgeteld kunnen worden voor het omzet-overzicht. Spiegelbeeld van formatPrice.
//   "€12"     -> 12
//   "200"     -> 200
//   "€200,-"  -> 200
//   "199,50"  -> 199.5
//   "199.5"   -> 199.5
//   ""/null   -> 0
export function parsePrice(raw: string | undefined | null): number {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return 0
  // Alleen cijfers, komma's en punten overhouden (euroteken, spaties, "-" weg).
  const digits = trimmed.replace(/[^\d.,]/g, '')
  if (!digits) return 0
  // Centen = een komma/punt gevolgd door 1-2 cijfers aan het einde.
  const cents = digits.match(/[.,](\d{1,2})$/)
  if (cents && cents.index !== undefined) {
    const whole = digits.slice(0, cents.index).replace(/[.,]/g, '') || '0'
    const value = parseFloat(`${whole}.${cents[1].padEnd(2, '0')}`)
    return Number.isFinite(value) ? value : 0
  }
  const value = parseInt(digits.replace(/[.,]/g, ''), 10)
  return Number.isFinite(value) ? value : 0
}

// Getal in euro's naar nette weergave voor totalen.
//   200    -> "€200,-"
//   199.5  -> "€199,50"
//   1234.5 -> "€1.234,50"
export function formatEuros(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  const hasCents = Math.round(rounded * 100) % 100 !== 0
  const whole = Math.floor(rounded)
  const wholeStr = whole.toLocaleString('nl-NL')
  if (!hasCents) return `€${wholeStr},-`
  const cents = Math.round((rounded - whole) * 100)
  return `€${wholeStr},${String(cents).padStart(2, '0')}`
}
