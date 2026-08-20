import type { Client } from './types'
import { sendBrandedMail, emailButton, escapeHtml, greetingName } from './email'
import { formatPrice } from './format'

const LOGIN_BASE = 'https://app.bjay.photo/login'
const AKKOORD_BASE = 'https://app.bjay.photo/akkoord'
const IBAN = 'NL03 TRBK 0594 0453 11'
const ACCOUNT_NAME = 'Berend Jan-Geert Walters'

const MONTHS_NL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']

// Shootdatum (YYYY-MM-DD) als nette NL-tekst, bv. "5 juli 2026". Deterministisch
// (geen afhankelijkheid van server-locale). Lege/ongeldige datum -> null.
function formatShootDate(date: string | undefined): string | null {
  if (!date || !date.trim()) return null
  const d = new Date(date.trim() + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return null
  return `${d.getDate()} ${MONTHS_NL[d.getMonth()]} ${d.getFullYear()}`
}

function loginLink(client: Client): string {
  return `${LOGIN_BASE}?code=${encodeURIComponent(client.code)}`
}

// Optioneel persoonlijk bericht als alinea (regelovergangen blijven behouden).
function noteHtml(client: Client): string | null {
  if (!client.personalNote || !client.personalNote.trim()) return null
  return `<p>${escapeHtml(client.personalNote.trim()).replace(/\n/g, '<br>')}</p>`
}
function noteText(client: Client): string | null {
  if (!client.personalNote || !client.personalNote.trim()) return null
  return client.personalNote.trim()
}

// Body (HTML) van de oplever-mail. Persoonlijk bericht bovenin, alleen over de
// foto's zelf; betalen loopt via het losse betaalverzoek. Ook gebruikt door de mail-preview.
export function accessBodyHtml(client: Client): string {
  const link = loginLink(client)
  const parts: (string | null)[] = [
    `<p>Hoi ${escapeHtml(greetingName(client))},</p>`,
    noteHtml(client),
    `<p>Je foto's staan klaar op je persoonlijke portaal!</p>`,
    emailButton(link, "Bekijk je foto's"),
    `<p>Je inlogcode is: <strong>${escapeHtml(client.code)}</strong></p>`,
    `<p>Veel plezier met de foto's. Vind je ze leuk? Tag me gerust @bjay.photo, dan deel ik je foto graag in mn story.</p>`,
  ]
  return parts.filter(Boolean).join('\n  ')
}

function accessBodyText(client: Client): string {
  const link = loginLink(client)
  const parts: (string | null)[] = [
    `Hoi ${greetingName(client)},`,
    noteText(client),
    "Je foto's staan klaar op je persoonlijke portaal!",
    `Bekijk en download ze hier:\n${link}`,
    `Je inlogcode is: ${client.code}`,
    "Veel plezier met de foto's. Vind je ze leuk? Tag me gerust @bjay.photo, dan deel ik je foto graag in mn story.",
  ]
  return parts.filter(Boolean).join('\n\n')
}

// Oplever-mail in huisstijl.
export async function sendAccessMail(client: Client): Promise<boolean> {
  if (!client.email) return false
  return sendBrandedMail({
    to: client.email,
    subject: "Je foto's van BJAY Fotografie staan klaar",
    bodyHtml: accessBodyHtml(client),
    bodyText: accessBodyText(client),
  })
}

// Body (HTML) van de sneak peek-mail. Zelfde portaal-link + code, andere tekst.
export function sneakPeekBodyHtml(client: Client): string {
  const name = greetingName(client)
  const link = loginLink(client)
  return `<p>Hoi ${escapeHtml(name)},</p>
  <p>Ik kon niet wachten, hier is alvast een kleine sneak peek!</p>
  <p>Ik heb een paar van mn favorieten al voor je bewerkt zodat je er nu al van kunt genieten. De volledige set volgt zo snel mogelijk.</p>
  ${emailButton(link, 'Bekijk de sneak peek')}
  <p>Je inlogcode is: <strong>${escapeHtml(client.code)}</strong></p>
  <p>Vind je ze leuk? Tag me gerust @bjay.photo, dan deel ik je foto graag in mn story.</p>`
}

function sneakPeekBodyText(client: Client): string {
  const name = greetingName(client)
  const link = loginLink(client)
  return `Hoi ${name},

Ik kon niet wachten, hier is alvast een kleine sneak peek!

Ik heb een paar van mn favorieten al voor je bewerkt zodat je er nu al van kunt genieten. De volledige set volgt zo snel mogelijk.

Bekijk de sneak peek hier:
${link}

Je inlogcode is: ${client.code}

Vind je ze leuk? Tag me gerust @bjay.photo, dan deel ik je foto graag in mn story.`
}

// Sneak peek-mail in huisstijl.
export async function sendSneakPeekMail(client: Client): Promise<boolean> {
  if (!client.email) return false
  return sendBrandedMail({
    to: client.email,
    subject: "Alvast een sneak peek van je foto's",
    bodyHtml: sneakPeekBodyHtml(client),
    bodyText: sneakPeekBodyText(client),
  })
}

// Boekingssamenvatting: shoot (albumnaam) + datum + bedrag. Datum en bedrag
// vallen weg als ze niet zijn ingevuld.
function bookingSummaryHtml(client: Client): string {
  const rows = [
    `<strong>Shoot:</strong> ${escapeHtml(client.name)}`,
    formatShootDate(client.date) ? `<strong>Datum:</strong> ${escapeHtml(formatShootDate(client.date)!)}` : null,
    formatPrice(client.price) ? `<strong>Afgesproken bedrag:</strong> ${formatPrice(client.price)}` : null,
  ].filter(Boolean)
  return `<p>${rows.join('<br>')}</p>`
}
function bookingSummaryText(client: Client): string {
  const rows = [
    `Shoot: ${client.name}`,
    formatShootDate(client.date) ? `Datum: ${formatShootDate(client.date)}` : null,
    formatPrice(client.price) ? `Afgesproken bedrag: ${formatPrice(client.price)}` : null,
  ].filter(Boolean)
  return rows.join('\n')
}

// Body (HTML) van de boekingsmail. Bevestigt de boeking en vraagt om akkoord op
// de algemene voorwaarden via de akkoord-pagina. Ook gebruikt door de mail-preview.
export function bookingBodyHtml(client: Client): string {
  const link = `${AKKOORD_BASE}?code=${encodeURIComponent(client.code)}`
  return [
    `<p>Hoi ${escapeHtml(greetingName(client))},</p>`,
    `<p>Leuk dat we samen aan de slag gaan! Hierbij even je boeking op een rij:</p>`,
    bookingSummaryHtml(client),
    `<p>Voordat we beginnen vraag ik je nog even mn algemene voorwaarden door te lezen en akkoord te geven. Da's zo gebeurd:</p>`,
    emailButton(link, 'Bekijk en ga akkoord met de voorwaarden'),
    `<p>Klopt er iets niet of heb je een vraag? Laat het gerust weten, ik denk graag met je mee.</p>`,
  ].join('\n  ')
}

function bookingBodyText(client: Client): string {
  const link = `${AKKOORD_BASE}?code=${encodeURIComponent(client.code)}`
  return [
    `Hoi ${greetingName(client)},`,
    'Leuk dat we samen aan de slag gaan! Hierbij even je boeking op een rij:',
    bookingSummaryText(client),
    "Voordat we beginnen vraag ik je nog even mn algemene voorwaarden door te lezen en akkoord te geven. Da's zo gebeurd:",
    `Bekijk en ga akkoord met de voorwaarden:\n${link}`,
    'Klopt er iets niet of heb je een vraag? Laat het gerust weten, ik denk graag met je mee.',
  ].join('\n\n')
}

// Betaalverzoek (vooral voor events): bedankt + afgesproken bedrag + IBAN +
// o.v.v. de event-/albumnaam. Geen formele factuur (geen KVK/BTW).
export function paymentRequestBodyHtml(client: Client): string {
  const amount = formatPrice(client.price)
  const naam = client.contactName && client.contactName.trim() ? escapeHtml(client.contactName.trim()) : null
  return [
    naam ? `<p>Hoi ${naam},</p>` : `<p>Hoi,</p>`,
    `<p>Bedankt voor de fijne samenwerking bij <strong>${escapeHtml(client.name)}</strong>!</p>`,
    amount
      ? `<p>Het afgesproken bedrag is <strong>${amount}</strong>. Je kunt dit overmaken naar <strong>${IBAN}</strong> t.n.v. ${ACCOUNT_NAME} (BJAY Fotografie), o.v.v. ${escapeHtml(client.name)}.</p>`
      : `<p>Voor het afgesproken bedrag kun je overmaken naar <strong>${IBAN}</strong> t.n.v. ${ACCOUNT_NAME} (BJAY Fotografie), o.v.v. ${escapeHtml(client.name)}.</p>`,
    `<p>Heb je nog vragen over de betaling? Laat het gerust weten.</p>`,
  ].join('\n  ')
}

function paymentRequestBodyText(client: Client): string {
  const amount = formatPrice(client.price)
  const naam = client.contactName && client.contactName.trim() ? client.contactName.trim() : null
  return [
    naam ? `Hoi ${naam},` : 'Hoi,',
    `Bedankt voor de fijne samenwerking bij ${client.name}!`,
    amount
      ? `Het afgesproken bedrag is ${amount}. Je kunt dit overmaken naar ${IBAN} t.n.v. ${ACCOUNT_NAME} (BJAY Fotografie), o.v.v. ${client.name}.`
      : `Voor het afgesproken bedrag kun je overmaken naar ${IBAN} t.n.v. ${ACCOUNT_NAME} (BJAY Fotografie), o.v.v. ${client.name}.`,
    'Heb je nog vragen over de betaling? Laat het gerust weten.',
  ].join('\n\n')
}

// Betaalverzoek-mail in huisstijl.
export async function sendPaymentRequestMail(client: Client): Promise<boolean> {
  if (!client.email) return false
  return sendBrandedMail({
    to: client.email,
    subject: `Betaalverzoek - ${client.name} - BJAY Fotografie`,
    bodyHtml: paymentRequestBodyHtml(client),
    bodyText: paymentRequestBodyText(client),
  })
}

// Boekingsmail in huisstijl.
export async function sendBookingMail(client: Client): Promise<boolean> {
  if (!client.email) return false
  return sendBrandedMail({
    to: client.email,
    subject: 'Je boeking bij BJAY Fotografie - even bevestigen',
    bodyHtml: bookingBodyHtml(client),
    bodyText: bookingBodyText(client),
  })
}
