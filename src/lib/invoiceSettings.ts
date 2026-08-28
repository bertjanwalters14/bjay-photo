// Vaste gegevens die op elke factuur komen. Eén plek, zodat je bij een
// verhuizing of een wijziging in je fiscale situatie maar één bestand hoeft
// aan te passen.
//
// LET OP: al bestaande facturen bewaren hun eigen kopie van deze gegevens
// (Invoice.sender + het btw-tarief). Wat je hier wijzigt geldt dus alleen voor
// NIEUWE facturen; een factuur die al uitgeschreven is verandert nooit meer mee.

import type { InvoiceSender } from './types'

export const INVOICE_SENDER: InvoiceSender = {
  name: 'Berend Jan-Geert Walters',
  tradeName: 'BJAY Fotografie',
  address: 'Land van Star Lichtenvoort 18',
  postalCode: '9617 EX',
  city: 'Harkstede',
  email: 'info@bjay.photo',
  phone: '06-15136672',
  iban: 'NL03 TRBK 0594 0453 11',
  accountName: 'Berend Jan-Geert Walters',
  // Btw-identificatienummer zoals toegekend door de Belastingdienst. Er staat
  // bewust geen KVK-nummer op de factuur: BJAY is als particulier voor de btw
  // geregistreerd en heeft geen inschrijving in het Handelsregister.
  vatNumber: 'NL005449758B10',
}

// Aantal dagen dat de klant heeft om te betalen, gerekend vanaf factuurdatum.
export const PAYMENT_TERM_DAYS = 14

// Btw-tarief op fotografiediensten: het algemene tarief van 21%. Reguliere
// btw-plicht, dus geen KOR-vrijstelling. Als fractie zodat het rekenwerk
// eenvoudig blijft; de weergave ("21%") komt uit formatVatRate().
export const VAT_RATE = 0.21

// Tarief als percentage voor op de factuur: 0.21 -> "21%".
export function formatVatRate(rate: number): string {
  const pct = rate * 100
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1).replace('.', ',')}%`
}
