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

export interface Order {
  id: string
  clientCode: string
  clientName: string
  customerName: string
  customerEmail: string
  photoUrl: string
  format: string
  price: string
  status: OrderStatus
  notes: string
  createdAt: string
  updatedAt: string
}
