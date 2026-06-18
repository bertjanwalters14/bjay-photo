// Gedeelde mail-helper voor alle KLANT-gerichte portal-mails: zelfde groene
// huisstijl + handtekening met logo. Interne meldingen (naar BJAY's eigen
// inbox) gebruiken dit bewust NIET; die blijven kale tekst.

const FROM = 'Bjay.photo <info@bjay.photo>'
const GREEN = '#053221'
const GOLD = '#c8a96e'
const LOGO_URL = 'https://app.bjay.photo/logoBJAYv3.0.png'

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Groene call-to-action knop voor in de body.
export function emailButton(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${href}" style="display:inline-block;background:${GREEN};color:${GOLD};text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">${label}</a></p>`
}

// Handtekening: tekst links, logo rechts (klikbaar), website onder de naam.
function signatureHtml(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
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
  </table>`
}

const SIGNATURE_TEXT = `Met lieve groeten,
Bert-Jan Walters
bjay.photo`

// Verpakt een body (HTML) in de groene huisstijl + handtekening.
export function brandedHtml(bodyHtml: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${GREEN};line-height:1.6;">${bodyHtml}${signatureHtml()}</div>`
}

// Verstuurt een klant-mail in huisstijl via Resend (HTML + plain-text fallback,
// beide met handtekening). Returnt true bij succes.
export async function sendBrandedMail(opts: {
  to: string
  subject: string
  bodyHtml: string
  bodyText: string
  replyTo?: string
}): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.error('RESEND_API_KEY ontbreekt - mail niet verstuurd')
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
        from: FROM,
        to: opts.to,
        subject: opts.subject,
        html: brandedHtml(opts.bodyHtml),
        text: `${opts.bodyText}\n\n${SIGNATURE_TEXT}`,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    })
    if (res.ok) return true
    console.error('Resend faalt:', await res.text())
    return false
  } catch (err) {
    console.error('Mail error:', err)
    return false
  }
}
