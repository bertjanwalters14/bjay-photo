import { escapeHtml } from './email'

interface OrderConfirmationOpts {
  customerName: string
  summary: string
  price: string
  isEvent: boolean
}

function nextStep(isEvent: boolean): string {
  return isEvent
    ? 'Zodra de betaling binnen is, ontvang je de foto(s) in hoge resolutie zonder watermerk per mail.'
    : 'Zodra de betaling binnen is, regel ik de print en stuur ik je een update.'
}

// Body (HTML) van de bestelbevestiging naar de klant. Ook gebruikt door de
// mail-preview.
export function orderConfirmationBodyHtml(opts: OrderConfirmationOpts): string {
  return `<p>Hoi ${escapeHtml(opts.customerName) || 'daar'},</p>
  <p>Bedankt voor je bestelling bij Bjay.photo!</p>
  <p><strong>Wat je hebt besteld:</strong><br>
  ${escapeHtml(opts.summary)}<br>
  Prijs: ${escapeHtml(opts.price)}</p>
  <p><strong>Hoe het verder gaat:</strong><br>
  1. Ik stuur je binnenkort persoonlijk een betaalverzoek (Tikkie of iDEAL-link).<br>
  2. ${nextStep(opts.isEvent)}</p>
  <p>Vragen? Beantwoord deze mail gewoon.</p>`
}

export function orderConfirmationBodyText(opts: OrderConfirmationOpts): string {
  return [
    `Hoi ${opts.customerName || ''},`.trim(),
    '',
    'Bedankt voor je bestelling bij Bjay.photo!',
    '',
    'Wat je hebt besteld:',
    `  ${opts.summary}`,
    `  Prijs: ${opts.price}`,
    '',
    'Hoe het verder gaat:',
    '  1. Ik stuur je binnenkort persoonlijk een betaalverzoek (Tikkie of iDEAL-link).',
    `  2. ${nextStep(opts.isEvent)}`,
    '',
    'Vragen? Beantwoord deze mail gewoon.',
  ].join('\n')
}
