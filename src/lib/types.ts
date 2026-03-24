export interface Client {
  id: string
  name: string
  email: string
  code: string
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

export interface ClientStats {
  totalPhotos: number
  favorites: string[]
  feedback: Feedback[]
}