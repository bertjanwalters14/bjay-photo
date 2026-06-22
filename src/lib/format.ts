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
