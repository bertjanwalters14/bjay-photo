'use client'

import Image from 'next/image'
import { Photo } from '@/lib/types'

interface Props {
  photos: Photo[]
  favorites: string[]
  onSelect: (photo: Photo) => void
  onToggleFavorite: (photoId: string) => void
}

export default function PhotoGrid({ photos, favorites, onSelect, onToggleFavorite }: Props) {
  return (
    <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
      {photos.map(photo => {
        const isFav = favorites.includes(photo.publicId)
        return (
          <div
            key={photo.publicId}
            className="relative break-inside-avoid group cursor-pointer rounded overflow-hidden"
            onClick={() => onSelect(photo)}
          >
            <Image
              src={photo.thumbnail}
              alt=""
              width={photo.width}
              height={photo.height}
              className="w-full h-auto object-cover transition duration-300 group-hover:brightness-75"
            />

            {/* Favoriet knop */}
            <button
              onClick={e => {
                e.stopPropagation()
                onToggleFavorite(photo.publicId)
              }}
              className="absolute top-2 right-2 text-xl opacity-0 group-hover:opacity-100 transition duration-200"
              title={isFav ? 'Verwijder favoriet' : 'Voeg toe aan favorieten'}
            >
              {isFav ? '❤️' : '🤍'}
            </button>

            {/* Altijd zichtbaar als favoriet */}
            {isFav && (
              <span className="absolute top-2 right-2 text-xl group-hover:hidden">❤️</span>
            )}
          </div>
        )
      })}
    </div>
  )
}