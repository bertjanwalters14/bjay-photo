import type { Client } from './types'
import { sendBrandedMail, emailButton, escapeHtml } from './email'

const LOGIN_BASE = 'https://app.bjay.photo/login'

// Aanhef: contactName indien gezet, anders het eerste woord van de albumnaam.
function greetingName(client: Client): string {
  return client.contactName && client.contactName.trim()
    ? client.contactName.trim()
    : client.name.trim().split(/\s+/)[0] || 'daar'
}

function loginLink(client: Client): string {
  return `${LOGIN_BASE}?code=${encodeURIComponent(client.code)}`
}

// Body (HTML) van de toegangsmail. Geexporteerd zodat de mail-preview 'm ook
// kan renderen.
export function accessBodyHtml(client: Client): string {
  const name = greetingName(client)
  const link = loginLink(client)
  return `<p>Hoi ${escapeHtml(name)},</p>
  <p>Je foto's staan klaar op je persoonlijke portaal!</p>
  ${emailButton(link, "Bekijk je foto's")}
  <p>Je inlogcode is: <strong>${escapeHtml(client.code)}</strong></p>
  <p>Veel plezier met de foto's. Vind je ze leuk? Tag me gerust @bjay.photo, dan deel ik je foto graag in mn story.</p>`
}

function accessBodyText(client: Client): string {
  const name = greetingName(client)
  const link = loginLink(client)
  return `Hoi ${name},

Je foto's staan klaar op je persoonlijke portaal!

Bekijk en download ze hier:
${link}

Je inlogcode is: ${client.code}

Veel plezier met de foto's. Vind je ze leuk? Tag me gerust @bjay.photo, dan deel ik je foto graag in mn story.`
}

// Toegangsmail in huisstijl.
export async function sendAccessMail(client: Client): Promise<boolean> {
  if (!client.email) return false
  return sendBrandedMail({
    to: client.email,
    subject: "Je foto's van BJAY Fotografie staan klaar",
    bodyHtml: accessBodyHtml(client),
    bodyText: accessBodyText(client),
  })
}
