import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { photoUrl, format, price, clientName, clientCode } = await req.json()

    const payload = {
      access_key: 'c7fd30ab-8f21-41a0-9c1f-ee06915d4062',
      email: 'info@bjay.photo',
      subject: `Nieuwe fotobestelling van ${clientName}`,
      from_name: 'Bjay.photo Galerij',
      message: `
Nieuwe bestelling ontvangen!

Klant: ${clientName} (code: ${clientCode})
Formaat: ${format}
Prijs: ${price}

Foto URL:
${photoUrl}
      `.trim(),
    }

    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const resText = await res.text()
    let data: Record<string, unknown> = {}
    try { data = JSON.parse(resText) } catch { data = { raw: resText } }

    if (!res.ok) {
      console.error('Web3Forms error:', data)
      return NextResponse.json({ error: 'Bestelling kon niet worden verstuurd', detail: data }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Orders route error:', err)
    return NextResponse.json({ error: 'Server fout', detail: String(err) }, { status: 500 })
  }
}