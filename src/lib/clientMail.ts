import type { Client } from './types'

const LOGIN_BASE = 'https://app.bjay.photo/login'
const LOGO_URL = 'https://app.bjay.photo/logoBJAYv3.0.png'
const GREEN = '#053221'

// Aanhef: contactName indien gezet, anders het eerste woord van de albumnaam.
function greetingName(client: Client): string {
  return client.contactName && client.contactName.trim()
    ? client.contactName.trim()
    : client.name.trim().split(/\s+/)[0] || 'daar'
}

function loginLink(client: Client): string {
  return `${LOGIN_BASE}?code=${encodeURIComponent(client.code)}`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Platte-tekst versie (fallback voor mailprogramma's zonder HTML).
function buildAccessText(client: Client): string {
  const name = greetingName(client)
  const link = loginLink(client)
  return `Hoi ${name},

Je foto's staan klaar op je persoonlijke portaal!

Bekijk en download ze hier:
${link}

Je inlogcode is: ${client.code}
(de link vult 'm al voor je in, je hoeft alleen nog op "Bekijk mijn foto's" te klikken)

Veel plezier met de foto's. Vind je ze leuk? Tag me gerust @bjay.photo, dan deel ik je foto graag in mn story.

Met lieve groeten,
Bert-Jan Walters
bjay.photo`
}

// HTML-versie: groene huisstijltekst, groene knop, en je logo als handtekening.
function buildAccessHtml(client: Client): string {
  const name = escapeHtml(greetingName(client))
  const code = escapeHtml(client.code)
  const link = loginLink(client)
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${GREEN};line-height:1.6;">
  <p>Hoi ${name},</p>
  <p>Je foto's staan klaar op je persoonlijke portaal!</p>
  <p style="margin:24px 0;">
    <a href="${link}" style="display:inline-block;background:${GREEN};color:#c8a96e;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">Bekijk je foto's</a>
  </p>
  <p>Of ga naar <a href="${link}" style="color:${GREEN};">${link}</a><br>
  Je inlogcode is: <strong>${code}</strong></p>
  <p>Veel plezier met de foto's. Vind je ze leuk? Tag me gerust @bjay.photo, dan deel ik je foto graag in mn story.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
    <tr>
      <td style="vertical-align:middle;padding-right:24px;font-family:Arial,Helvetica,sans-serif;color:${GREEN};font-size:14px;line-height:1.5;">
        Met lieve groeten,<br>
        <strong style="font-size:15px;">Bert-Jan Walters</strong><br>
        <a href="https://bjay.photo" style="color:${GREEN};">bjay.photo</a>
      </td>
      <td style="vertical-align:middle;">
        <a href="https://bjay.photo"><img src="${LOGO_URL}" alt="BJAY Fotografie" width="180" style="display:block;border:0;outline:none;text-decoration:none;"></a>
      </td>
    </tr>
  </table>
</div>`
}

// Stuurt de toegangsmail via Resend (HTML + plain-text fallback). True bij succes.
export async function sendAccessMail(client: Client): Promise<boolean> {
  if (!client.email) return false

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.error('RESEND_API_KEY ontbreekt - toegangsmail niet verstuurd')
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Bjay.photo <info@bjay.photo>',
        to: client.email,
        subject: "Je foto's van BJAY Fotografie staan klaar",
        html: buildAccessHtml(client),
        text: buildAccessText(client),
      }),
    })
    if (res.ok) return true
    console.error('Resend toegangsmail faalt:', await res.text())
    return false
  } catch (err) {
    console.error('Toegangsmail error:', err)
    return false
  }
}
