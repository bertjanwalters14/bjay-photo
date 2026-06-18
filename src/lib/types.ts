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
  // Datum van het event/de shoot zelf (los van createdAt = aanmaakmoment).
  // Optioneel; gebruikt om de klantenlijst chronologisch te sorteren.
  date?: string
  // Review-flow velden. Workflow: BJAY markeert klant als opgeleverd ->
  // 3 dagen later stuurt cron automatisch een review-vraag per e-mail.
  // BJAY kan handmatig markeren dat er een review binnen is.
  deliveredAt?: string | null         // ISO datum waarop foto's zijn opgeleverd
  reviewRequestedAt?: string | null   // ISO datum waarop review-mail is verstuurd
  reviewReceived?: boolean            // BJAY vinkt aan als hij de review op Google ziet
  // Archief-flow (alleen voor event-portals): foto's worden 30 dagen na
  // aanmaken automatisch uit Cloudinary verwijderd. archiveWarningAt = mail
  // is verstuurd 7 dagen vooraf. archivedAt = foto's zijn daadwerkelijk weg.
  archiveWarningAt?: string | null
  archivedAt?: string | null
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
  createdAt: string
  updatedAt: string
}
