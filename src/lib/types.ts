export type PortalType = 'personal' | 'event'

// Evenement in de events-collectie. Een event kan tegelijk meerdere rollen
// hebben: getoond als popup op bjay.photo (popupActive), aanvraagbaar voor
// laatkomers die nog geen wachtwoord hebben (requestable), of geen van beide
// (archief).
export interface Event {
  slug: string             // URL-vriendelijk en redis key suffix
  name: string             // bv. "GLTB Open 2025"
  label: string            // gouden labeltje bovenaan popup ("Live nu" etc.)
  description: string
  password: string         // leeg als er geen wachtwoord getoond hoeft te worden
  loginUrl: string
  dismissKey: string       // localStorage key, uniek per event
  popupActive: boolean     // true = wordt als popup getoond op bjay.photo
  requestable: boolean     // true = mensen kunnen wachtwoord aanvragen
  createdAt: string
  updatedAt: string
}

// Wachtwoord-aanvraag van een bezoeker die wel bij een event aanwezig was
// maar geen wachtwoord heeft (kaartje of shirt gezien, geen contact gehad).
export interface EventRequest {
  id: string
  eventSlug: string
  eventName: string        // opgeslagen ter referentie ook als event verwijderd wordt
  name: string
  email: string
  phone: string
  message: string
  context: string          // hoe ze BJAY tegenkwamen (kaartje, shirt, etc.)
  handled: boolean
  createdAt: string
}

// "Meest recente momenten" tegels op de homepage van bjay.photo. Beheer via
// /admin/recent, publiek opvraagbaar via /api/recent (met CORS).
export interface RecentPhoto {
  url: string       // Cloudinary URL (https://res.cloudinary.com/.../upload/.../v.../bjay/home/xxx.jpg)
  alt: string       // alt-tekst voor toegankelijkheid + SEO
  href: string      // doel-link als bezoeker klikt (bv. /sportfotograaf-hyrox)
  publicId: string  // Cloudinary public_id, gebruikt voor delete-acties
}

export interface Client {
  id: string
  name: string
  email: string
  code: string
  type: PortalType
  createdAt: string
  // Als gezet: deze client toont (en uploadt naar) de Cloudinary-map van de
  // opgegeven andere client-code, in plaats van zijn eigen map. Zo kan bv.
  // een 'personal' commissie-album dezelfde foto's tonen als het 'event'-
  // album van de deelnemers, zonder dat je alles twee keer moet uploaden.
  photoSourceClientId?: string
  // Datum van het event/de shoot zelf (los van createdAt = aanmaakmoment).
  // Optioneel; gebruikt om de klantenlijst chronologisch te sorteren.
  date?: string
  // Voornaam/namen van de persoon/personen, voor de aanhef in mails ("Hoi ...").
  // Los van `name` (de albumnaam). Leeg = val terug op het eerste woord van name.
  contactName?: string
  // Review-flow velden. Workflow: BJAY markeert klant als opgeleverd ->
  // 3 dagen later stuurt cron automatisch een review-vraag per e-mail.
  // BJAY kan handmatig markeren dat er een review binnen is.
  deliveredAt?: string | null         // ISO datum waarop foto's zijn opgeleverd
  reviewRequestedAt?: string | null   // ISO datum waarop review-mail is verstuurd
  reviewReceived?: boolean            // BJAY vinkt aan als hij de review op Google ziet
  // Archief-flow (alleen voor event-portals): foto's worden 30 dagen na
  // aanmaken automatisch uit Cloudinary verwijderd. archiveWarningAt = mail
  // is verstuurd 7 dagen vooraf. archivedAt = foto's zijn daadwerkelijk weg.
  // archiveDeadline = optionele handmatige override van de 30-dagen-grens
  // (bv. "nog 2 weken verlengen"); indien gezet, telt deze datum in plaats
  // van createdAt + 30 dagen.
  archiveWarningAt?: string | null
  archivedAt?: string | null
  archiveDeadline?: string | null
  // Wanneer de toegangsmail (inloglink + code) naar de klant is verstuurd.
  accessMailSentAt?: string | null
  // Wanneer de sneak peek-mail (paar bewerkte favorieten vooraf) is verstuurd.
  sneakPeekSentAt?: string | null
  // Afgesproken bedrag voor de shoot (vrije tekst, bv. "€200"). Leeg = geen
  // betaalregel in de oplever-mail.
  price?: string
  // Vrij persoonlijk bericht; verschijnt als alinea bovenin de oplever-mail.
  personalNote?: string
  // Wanneer het afgesproken bedrag (price) daadwerkelijk is ontvangen. Alleen
  // relevant voor personal shoots; gezet via de "Markeer als betaald"-knop.
  // Telt mee in het omzet-overzicht. Leeg/null = nog niet betaald.
  paidAt?: string | null
  // Boekingsbevestiging + voorwaarden-akkoord (alleen personal). bookingMailSentAt
  // = wanneer de boekingsmail met de akkoord-knop is verstuurd. termsAcceptedAt
  // = wanneer de klant op "Ik ga akkoord" klikte (via de mail-link of de
  // galerij-gate). Leeg = nog niet akkoord.
  bookingMailSentAt?: string | null
  termsAcceptedAt?: string | null
  // Wanneer het betaalverzoek (bedrag + IBAN) naar de klant/organisator is
  // gestuurd. Vooral voor events; personal heeft de betaalregel al in de
  // oplever-mail.
  paymentRequestSentAt?: string | null
  // Factuuradres van de klant (vrije tekst, meerdere regels: bedrijfsnaam,
  // straat, postcode + plaats). Alleen nodig als je een factuur wilt maken;
  // een factuur moet nu eenmaal naam en adres van de ontvanger bevatten.
  invoiceAddress?: string
  // Backlink naar de factuur die voor deze klant is aangemaakt (bv. '2026-001').
  // Leeg = nog geen factuur. Zie Invoice; die is leidend, dit is alleen zodat
  // de klantpagina weet of er al een factuur ligt.
  invoiceNumber?: string
}

export interface Photo {
  publicId: string
  url: string
  thumbnail: string
  width: number
  height: number
  createdAt: string
  // Schone download-URL op volledige resolutie. Alleen gezet voor personal-
  // portals; bij events undefined zodat bezoekers alleen de gewatermerkte
  // preview krijgen tot ze betalen.
  downloadUrl?: string
}

export interface Feedback {
  photoId: string
  message: string
  createdAt: string
  // Naam van de bezoeker (bij events: dezelfde naam als voor likes gebruikt).
  // Ontbreekt bij oudere reacties van vóór het publieke reactie-draadje.
  name?: string
}

export interface Like {
  photoId: string
  name: string
  createdAt: string
}

export interface ClientStats {
  totalPhotos: number
  favorites: string[]
  feedback: Feedback[]
  likes: Like[]
}

export type OrderStatus =
  | 'new'
  | 'contacted'
  | 'paid'
  | 'shipped'
  | 'cancelled'

// Event-pakketten voor digitale downloads.
// 'custom' = vrije selectie, prijs berekend uit aantal foto's met bundel-korting.
// 'unlimited' = alle foto's voor €25.
// 'single' / 'pack3' / 'pack5' bestaan voor backwards-compat met oude orders;
// nieuwe orders gebruiken 'custom' of 'unlimited'.
export type EventPackage = 'single' | 'pack3' | 'pack5' | 'unlimited' | 'custom'

export interface Order {
  id: string
  clientCode: string
  clientName: string
  customerName: string
  customerEmail: string
  // Voor personal print orders: photoUrl + format. Voor event digital orders: packageType + photoUrls.
  photoUrl: string
  photoUrls?: string[]
  format: string
  packageType?: EventPackage
  price: string
  status: OrderStatus
  notes: string
  // Wanneer het Google-review verzoek naar de klant is gestuurd (handmatig
  // vanaf de orders-adminpagina, na betaald/verzonden). Leeg = nog niet.
  reviewRequestedAt?: string | null
  createdAt: string
  updatedAt: string
}

// Afzendergegevens op een factuur. Wordt als kopie in de factuur opgeslagen
// zodat een oude factuur niet meeverandert als je verhuist of straks een
// KVK-/btw-nummer toevoegt. Actuele waarden: src/lib/invoiceSettings.ts.
export interface InvoiceSender {
  name: string
  tradeName: string
  address: string
  postalCode: string
  city: string
  email: string
  phone: string
  iban: string
  accountName: string
  // Btw-identificatienummer. Verplicht op de factuur nu er btw in rekening
  // wordt gebracht. Geen KVK-nummer: BJAY staat als particulier bij de
  // Belastingdienst geregistreerd en heeft geen inschrijving in het
  // Handelsregister.
  vatNumber: string
}

// Een uitgeschreven factuur. Bewust een VOLLEDIGE momentopname: bedrag,
// omschrijving, klantgegevens en afzender worden bij het aanmaken vastgelegd
// en daarna nooit meer aangepast. Wijzig je later Client.price, dan blijft de
// verstuurde factuur kloppen. Redis: `invoice:<number>` + set `invoices:all`,
// nummers uit teller `invoice:counter:<jaar>`.
export interface Invoice {
  number: string            // '2026-001', doorlopend per kalenderjaar
  clientCode: string        // welke klant/shoot dit was
  createdAt: string         // ISO, moment van uitschrijven
  invoiceDate: string       // 'YYYY-MM-DD'
  dueDate: string           // 'YYYY-MM-DD', factuurdatum + PAYMENT_TERM_DAYS
  deliveryDate?: string     // 'YYYY-MM-DD', datum van de shoot/het event
  // Momentopname klant
  customerName: string
  customerAddress?: string  // meerdere regels, zoals ingevoerd
  customerEmail?: string
  customerContactName?: string  // aanhef voor de factuurmail ("Hoi ...")
  // Momentopname factuurregel (één regel; zie handoff)
  description: string
  amount: number            // bedrag EXCLUSIEF btw, in euro's
  vatRate?: number          // btw-tarief als fractie, bv. 0.21
  vatAmount?: number        // btw-bedrag in euro's
  totalIncl?: number        // amount + vatAmount, wat de klant betaalt
  // Legacy: facturen van vóór de btw-plicht droegen alleen een tekstregel
  // ("Geen btw in rekening gebracht") en geen btw-opbouw. Blijft staan zodat
  // zo'n oude factuur nog correct rendert; nieuwe facturen zetten 'm niet.
  vatNote?: string
  // Momentopname afzender
  sender: InvoiceSender
  // Wanneer de factuur als PDF-bijlage naar de klant is gemaild. Het enige
  // veld dat na het uitschrijven nog verandert; de factuurinhoud zelf niet.
  sentAt?: string | null
}
