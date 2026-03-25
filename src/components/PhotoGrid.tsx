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
    <div className="columns-2 sm:columns-3 lg:columns-4 gap-2 space-y-2">
      {photos.map(photo => {
        const isFav = favorites.includes(photo.publicId)
        return (
          <div
            key={photo.publicId}
            className="relative break-inside-avoid group cursor-pointer overflow-hidden"
            onClick={() => onSelect(photo)}
          >
            <Image
              src={photo.thumbnail}
              alt=""
              width={photo.width}
              height={photo.height}
              className="w-full h-auto object-cover transition duration-500 group-hover:scale-[1.03] group-hover:brightness-75"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(3,42,28,0.5) 0%, transparent 50%)' }}
            />

            {/* Favoriet knop */}
            <button
              onClick={e => { e.stopPropagation(); onToggleFavorite(photo.publicId) }}
              className="absolute top-2 right-2 transition duration-200 hover:scale-110"
              style={{ opacity: isFav ? 1 : 0 }}
              title={isFav ? 'Verwijder favoriet' : 'Voeg toe aan favorieten'}
            >
              <HeartIcon filled={isFav} />
            </button>

            {/* Toon hartje bij hover via group */}
            {!isFav && (
              <button
                onClick={e => { e.stopPropagation(); onToggleFavorite(photo.publicId) }}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition duration-200 hover:scale-110"
                title="Voeg toe aan favorieten"
              >
                <HeartIcon filled={false} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? '#c8a96e' : 'none'}
      stroke="#c8a96e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}