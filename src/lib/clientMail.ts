import type { Client } from './types'
import { sendBrandedMail, emailButton, escapeHtml } from './email'

const LOGIN_BASE = 'https://app.bjay.photo/login'
const IBAN = 'NL03 TRBK 0594 0453 11'
const ACCOUNT_NAME = 'Berend Jan-Geert Walters'

// Aanhef: contactName indien gezet, anders het eerste woord van de albumnaam.
function greetingName(client: Client): string {
  return client.contactName && client.contactName.trim()
    ? client.contactName.trim()
    : client.name.trim().split(/\s+/)[0] || 'daar'
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

// Optionele betaalregel (alleen als er een bedrag is ingevuld).
function paymentHtml(client: Client): string | null {
  if (!client.price || !client.price.trim()) return null
  return `<p>Het afgesproken bedrag voor de shoot is <strong>${escapeHtml(client.price.trim())}</strong>. Je kunt dit overmaken naar <strong>${IBAN}</strong> t.n.v. ${ACCOUNT_NAME} (dat ben ik, BJAY Fotografie), o.v.v. ${escapeHtml(client.name)}.</p>`
}
function paymentText(client: Client): string | null {
  if (!client.price || !client.price.trim()) return null
  return `Het afgesproken bedrag voor de shoot is ${client.price.trim()}. Je kunt dit overmaken naar ${IBAN} t.n.v. ${ACCOUNT_NAME} (dat ben ik, BJAY Fotografie), o.v.v. ${client.name}.`
}

// Body (HTML) van de oplever-mail. Persoonlijk bericht bovenin, betaalregel
// onderaan; beide alleen als ze ingevuld zijn. Ook gebruikt door de mail-preview.
export function accessBodyHtml(client: Client): string {
  const link = loginLink(client)
  const parts: (string | null)[] = [
    `<p>Hoi ${escapeHtml(greetingName(client))},</p>`,
    noteHtml(client),
    `<p>Je foto's staan klaar op je persoonlijke portaal!</p>`,
    emailButton(link, "Bekijk je foto's"),
    `<p>Je inlogcode is: <strong>${escapeHtml(client.code)}</strong></p>`,
    `<p>Veel plezier met de foto's. Vind je ze leuk? Tag me gerust @bjay.photo, dan deel ik je foto graag in mn story.</p>`,
    paymentHtml(client),
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
    paymentText(client),
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
