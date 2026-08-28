// Vaste gegevens die op elke factuur komen. Eén plek, zodat je bij een
// verhuizing of zodra je bij de KVK ingeschreven staat maar één bestand
// hoeft aan te passen.
//
// LET OP: al bestaande facturen bewaren hun eigen kopie van deze gegevens
// (Invoice.sender). Wat je hier wijzigt geldt dus alleen voor NIEUWE facturen;
// een factuur die al verstuurd is verandert nooit meer mee.

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
  // Leeg = wordt niet op de factuur getoond. Vul in zodra de inschrijving rond
  // is; dan verschijnen ze automatisch in de voettekst van nieuwe facturen.
  kvk: '',
  vatNumber: '',
}

// Aantal dagen dat de klant heeft om te betalen, gerekend vanaf factuurdatum.
export const PAYMENT_TERM_DAYS = 14

// Btw-regel onderaan de factuur. Nu geen btw omdat er (nog) geen
// btw-ondernemerschap is; de opbrengst gaat als resultaat uit overige
// werkzaamheden in de IB-aangifte.
//
// Zodra je ingeschreven staat MET de kleineondernemersregeling wordt dit:
//   'Vrijgesteld van btw op grond van de kleineondernemersregeling (KOR).'
// Zonder KOR moet de factuur btw specificeren en is deze regel niet genoeg;
// dan moeten ook de btw-kolommen op de factuurpagina terugkomen.
export const VAT_NOTE = 'Geen btw in rekening gebracht.'
