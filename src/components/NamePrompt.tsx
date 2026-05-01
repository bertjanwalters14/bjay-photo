'use client'

import { useState } from 'react'

interface Props {
  eventName?: string
  onSubmit: (name: string) => void
}

export default function NamePrompt({ eventName, onSubmit }: Props) {
  const [name, setName] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(8,15,12,0.92)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="rounded-lg w-full max-w-sm p-6"
        style={{ backgroundColor: '#fff', border: '1px solid rgba(200,169,110,0.4)' }}
      >
        <h2
          className="text-lg font-light mb-2 tracking-wide"
          style={{ color: '#053221' }}
        >
          Welkom{eventName ? ` bij ${eventName}` : ''}
        </h2>
        <p className="text-sm mb-5" style={{ color: '#4a6358' }}>
          Vul je naam in om foto's te liken. Zo kunnen we onthouden welke foto's jij leuk vond.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Jouw naam"
            autoFocus
            required
            maxLength={60}
            className="w-full px-4 py-3 text-sm focus:outline-none transition"
            style={{
              backgroundColor: '#fff',
              color: '#053221',
              border: '1px solid rgba(200,169,110,0.4)',
            }}
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="py-3 text-xs font-medium tracking-widest uppercase transition disabled:opacity-40"
            style={{ backgroundColor: '#053221', color: '#c8a96e' }}
          >
            Ga naar de galerij
          </button>
        </form>

        <p className="text-xs mt-4" style={{ color: 'rgba(74,99,88,0.7)' }}>
          Je naam wordt alleen op dit apparaat onthouden.
        </p>
      </div>
    </div>
  )
}
