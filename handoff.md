# Bjay.photo — Handoff Document

## Project info
- **Locatie:** `C:\Users\Bert-Jan\Documents\BJAY site\bjay-photo`
- **Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS · Cloudinary · Upstash Redis · Vercel
- **Start dev server:** `npm run dev` (draait op poort 3002)
- **Live URL:** Vercel (gedeployed via GitHub)

---

## Huisstijl kleuren
| Variabele | Hex | Gebruik |
|---|---|---|
| Donkergroen | `#053221` | Header, achtergrond, knoppen |
| Diepgroen | `#032a1c` | Topbar, inputs |
| Goud | `#c8a96e` | Accent, titels, borders |
| Lichtgroen wit | `#e8ede9` | Pagina achtergrond |
| Middengroen | `#4a6358` | Bodytekst |

---

## .env.local variabelen
```env
CLOUDINARY_CLOUD_NAME="db07aqlkd"
CLOUDINARY_API_KEY="447663587174545"
CLOUDINARY_API_SECRET="znf28PkeyonWJHXWRs-qxD6DV6Y"
KV_REST_API_URL="https://valid-oryx-111897.upstash.io"
KV_REST_API_TOKEN="<token uit Vercel>"
ADMIN_PASSWORD="<jouw wachtwoord>"
NEXTAUTH_SECRET="<jouw secret>"
```
> ⚠️ Alle waarden tussen aanhalingstekens in `.env.local`
> ⚠️ Upstash database is de Vercel gekoppelde database (`valid-oryx`), NIET de oude `peaceful-buzzard` (deleted)

---

## Wat is klaar ✅

### Fundament
- [x] Next.js 16 installatie met TypeScript, Tailwind, App Router
- [x] Dependencies: `@upstash/redis`, `cloudinary`, `jose`, `nanoid`
- [x] `.env.local` ingevuld
- [x] `next.config.ts` — Cloudinary hostname toegevoegd

### Lib bestanden (`src/lib/`)
- [x] `redis.ts` — Upstash Redis client
- [x] `cloudinary.ts` — Cloudinary client
- [x] `auth.ts` — JWT sessie helpers

### Middleware
- [x] `src/middleware.ts` — Beschermt `/gallery/*` en `/admin/*` routes

### API Routes (`src/app/api/`)
- [x] `auth/client/route.ts`
- [x] `auth/admin/route.ts` ⚠️ debug logs nog aanwezig — verwijderen vóór productie!
- [x] `auth/logout/route.ts`
- [x] `clients/route.ts`
- [x] `clients/[clientId]/route.ts`
- [x] `clients/[clientId]/photos/route.ts`
- [x] `clients/[clientId]/favorites/route.ts`
- [x] `clients/[clientId]/feedback/route.ts`
- [x] `upload/route.ts`

### Pagina's
- [x] `app/page.tsx` — Redirect naar `/login`
- [x] `app/layout.tsx`
- [x] `app/login/page.tsx` — Klant login
- [x] `app/admin/login/page.tsx` — Admin login
- [x] `app/admin/dashboard/page.tsx` — Klantenoverzicht
- [x] `app/admin/clients/new/page.tsx` — Nieuwe klant/evenement aanmaken
- [x] `app/admin/clients/[clientId]/page.tsx` — Klant beheren + upload + reacties
- [x] `app/gallery/[clientId]/page.tsx` — Fotogalerij

### Components
- [x] `components/PhotoGrid.tsx`
- [x] `components/PhotoModal.tsx` — Met pijltjes navigatie + feedback per foto

---

## Bezig: Type systeem (personal vs event) 🔄

De volgende bestanden moeten nog worden bijgewerkt. De nieuwe code staat klaar in de chat maar is nog NIET in de bestanden gezet:

### 1. `src/lib/types.ts` — vervangen met:
```typescript
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
```

### 2. `src/app/admin/clients/new/page.tsx` — vervangen
Nieuw formulier met type-keuze (personal/event) en optioneel eigen wachtwoord/code.
Volledige code staat in de chat (artifact `admin_new_client`).

### 3. `src/app/api/clients/route.ts` — vervangen
Verwerkt nu `type` en `customCode` bij aanmaken.
Volledige code staat in de chat (artifact `api_clients`).

---

## Nog te bouwen ❌

### Type systeem (vervolg na bovenstaande fixes)
- [ ] Dashboard: type badge tonen per klant (👤 / 🎪)
- [ ] Galerij pagina: bij `event` type andere UI tonen (liken met naam i.p.v. favorieten)
- [ ] Liken: naam opgeven bij like, opslaan in Redis als `client:{code}:likes`
- [ ] Admin klantpagina: likes tonen per foto met naam

### Bestellen + betalen
- [ ] Stripe integratie (iDeal support)
- [ ] Bestelpakketten: 1 foto €5 / 3 foto's €12 / 5 foto's €18 / onbeperkt €25
- [ ] Bestelflow: foto selecteren → pakket kiezen → naam+email → betalen
- [ ] Bevestigingsmail na betaling
- [ ] Admin: bestellingen inzien per evenement

### Overig
- [ ] Debug logs verwijderen uit `auth/admin/route.ts`
- [ ] Testen volledige flow op Vercel

---

## Cloudinary structuur
```
bjay/clients/{clientCode}/foto.jpg
```

## Redis datamodel
```
client:{code}              → { id, name, email, code, type, createdAt }
clients:all                → Set van alle client codes
client:{code}:favorites    → Set van foto public_ids (personal)
client:{code}:likes        → List van { photoId, name, createdAt } (event)
client:{code}:feedback     → List van { photoId, message, createdAt }
```