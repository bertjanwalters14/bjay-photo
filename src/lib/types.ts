export type PortalType = 'personal' | 'event'

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
  originalUrl: string
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
