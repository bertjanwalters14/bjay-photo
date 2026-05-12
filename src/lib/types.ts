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

export interface Client {
  id: string
  name: string
  email: string
  code: string
  type: PortalType
  createdAt: string
}

export interface Photo {
  publicId: string
  url: string
  thumbnail: string
  width: number
  height: number
  createdAt: string
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
