# Bjay.photo — Handoff Document

## Project info
- **Locatie:** `C:\Users\Bert-Jan\Documents\BJAY site\bjay-photo`
- **Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS · Cloudinary · Upstash Redis · Vercel
- **Start dev server:** `npm run dev` (draait op poort 3002)

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
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
KV_REST_API_URL=
KV_REST_API_TOKEN=
ADMIN_PASSWORD=
NEXTAUTH_SECRET=
```
> ⚠️ Zet alle waarden tussen aanhalingstekens in `.env.local`

---

## Wat is klaar ✅

### Fundament
- [x] Next.js 16 installatie met TypeScript, Tailwind, App Router
- [x] Dependencies: `@upstash/redis`, `cloudinary`, `jose`, `nanoid`
- [x] `.env.local` ingevuld
- [x] `next.config.ts` — Cloudinary hostname toegevoegd aan images

### Lib bestanden (`src/lib/`)
- [x] `redis.ts` — Upstash Redis client
- [x] `cloudinary.ts` — Cloudinary client
- [x] `types.ts` — TypeScript types (Client, Photo, Feedback, ClientStats)
- [x] `auth.ts` — JWT sessie helpers (create/get/clear voor klant en admin)

### Middleware
- [x] `src/middleware.ts` — Beschermt `/gallery/*` en `/admin/*` routes

### API Routes (`src/app/api/`)
- [x] `auth/client/route.ts` — Klant login via code
- [x] `auth/admin/route.ts` — Admin login via wachtwoord ⚠️ debug logs nog aanwezig, verwijderen!
- [x] `auth/logout/route.ts` — Uitloggen
- [x] `clients/route.ts` — GET alle klanten / POST nieuwe klant
- [x] `clients/[clientId]/route.ts` — GET één klant
- [x] `clients/[clientId]/photos/route.ts` — Foto's ophalen van Cloudinary
- [x] `clients/[clientId]/favorites/route.ts` — GET/POST favorieten
- [x] `clients/[clientId]/feedback/route.ts` — GET/POST feedback
- [x] `upload/route.ts` — Foto upload naar Cloudinary

### Pagina's
- [x] `app/page.tsx` — Redirect naar `/login`
- [x] `app/layout.tsx` — Global layout met Geist font
- [x] `app/login/page.tsx` — Klant loginpagina ⚠️ kleuren laden soms niet (cache issue)
- [x] `app/admin/login/page.tsx` — Admin loginpagina
- [x] `app/admin/dashboard/page.tsx` — Overzicht alle klanten
- [x] `app/admin/clients/new/page.tsx` — Nieuwe klant aanmaken
- [x] `app/admin/clients/[clientId]/page.tsx` — Klant beheren + foto's uploaden + reacties met foto thumbnail
- [x] `app/gallery/[clientId]/page.tsx` — Klant fotogalerij

### Components
- [x] `components/PhotoGrid.tsx` — Masonry fotogrid met favoriet knop
- [x] `components/PhotoModal.tsx` — Vergroot foto + pijltjes navigatie + download + favoriet + feedback per foto

---

## Wat nog moet ❌

- [ ] Debug logs verwijderen uit `src/app/api/auth/admin/route.ts`
- [ ] Klant loginpagina kleuren checken (toont soms zwart)
- [ ] Testen: foto thumbnail naast reacties in admin
- [ ] Deployen op Vercel

---

## Cloudinary structuur
```
bjay/clients/{clientCode}/foto.jpg
```

## Redis datamodel
```
client:{code}              → { id, name, email, code, createdAt }
clients:all                → Set van alle client codes
client:{code}:favorites    → Set van foto public_ids
client:{code}:feedback     → List van { photoId, message, createdAt }
```