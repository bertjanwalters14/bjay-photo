'use client'

import Image from 'next/image'
import { Photo } from '@/lib/types'

interface Props {
  photos: Photo[]
  favorites: string[]
  onSelect: (photo: Photo) => void
  onToggleFavorite: (photoId: string) => void
  // Optioneel: like-counts per foto. Wanneer gezet wordt elke foto met >0 likes
  // een count-badge onderin links getoond. Negeer voor personal portals.
  likeCounts?: Record<string, number>
  // Optioneel: cart-selectie voor digitale event-bestellingen.
  // Wanneer gezet komt er een tweede knop op elke foto en een visuele markering.
  selectedIds?: string[]
  onToggleSelection?: (photoId: string) => void
}

export default function PhotoGrid({
  photos,
  favorites,
  onSelect,
  onToggleFavorite,
  likeCounts,
  selectedIds,
  onToggleSelection,
}: Props) {
  const selectionMode = Boolean(onToggleSelection)

  return (
    <div className="columns-2 sm:columns-3 lg:columns-4 gap-2 space-y-2">
      {photos.map(photo => {
        const isFav = favorites.includes(photo.publicId)
        const count = likeCounts?.[photo.publicId] ?? 0
        const isSelected = selectedIds?.includes(photo.publicId) ?? false
        return (
          <div
            key={photo.publicId}
            className="relative break-inside-avoid group cursor-pointer overflow-hidden"
            onClick={() => onSelect(photo)}
            style={{
              boxShadow: isSelected
                ? '0 0 0 3px #c8a96e, 0 0 18px rgba(200,169,110,0.4)'
                : undefined,
            }}
          >
            <Image
              src={photo.thumbnail}
              alt=""
              width={photo.width}
              height={photo.height}
              className="w-full h-auto object-cover transition duration-500 group-hover:scale-[1.03] group-hover:brightness-75"
            />

            {/* Hover overlay */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(3,42,28,0.5) 0%, transparent 50%)' }}
            />

            {/* Favoriet/like knop rechtsboven */}
            <button
              onClick={e => { e.stopPropagation(); onToggleFavorite(photo.publicId) }}
              className="absolute top-2 right-2 transition duration-200 hover:scale-110"
              style={{ opacity: isFav ? 1 : 0 }}
              title={isFav ? 'Verwijder favoriet' : 'Voeg toe aan favorieten'}
            >
              <HeartIcon filled={isFav} />
            </button>

            {!isFav && (
              <button
                onClick={e => { e.stopPropagation(); onToggleFavorite(photo.publicId) }}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition duration-200 hover:scale-110"
                title="Voeg toe aan favorieten"
              >
                <HeartIcon filled={false} />
              </button>
            )}

            {/* Selectie knop linksboven (alleen event mode) */}
            {selectionMode && (
              <button
                onClick={e => { e.stopPropagation(); onToggleSelection?.(photo.publicId) }}
                className="absolute top-2 left-2 transition duration-200 hover:scale-110"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: isSelected ? '#c8a96e' : 'rgba(5,50,33,0.7)',
                  color: isSelected ? '#053221' : '#c8a96e',
                  border: '2px solid #c8a96e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 'bold',
                  backdropFilter: 'blur(4px)',
                }}
                title={isSelected ? 'Verwijder uit bestelling' : 'Voeg toe aan bestelling'}
              >
                {isSelected ? '✓' : '+'}
              </button>
            )}

            {/* Like count badge linksonder (alleen events met >0 likes) */}
            {likeCounts && count > 0 && (
              <div
                className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 text-xs"
                style={{
                  backgroundColor: 'rgba(5,50,33,0.65)',
                  color: '#c8a96e',
                  borderRadius: '999px',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <HeartIcon filled small />
                <span className="font-medium">{count}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function HeartIcon({ filled, small }: { filled: boolean; small?: boolean }) {
  const size = small ? 12 : 22
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? '#c8a96e' : 'none'}
      stroke="#c8a96e"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={small ? undefined : { filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}
