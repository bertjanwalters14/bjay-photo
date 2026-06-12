# Bjay.photo — Handoff voor volgende sessie

Geactualiseerd: juni 2026, na 2 maanden bouwen.

## Wat draait er nu

**Bjay.photo** is een Next.js 16 fotografie-portal voor een beginnend fotograaf (Bert-Jan).
Twee soorten portals:

- **Event-portals** (Hyrox, tennistoernooien): één code voor alle deelnemers, verschillende bezoekers vullen hun naam in, ze kopen losse foto's of pakketten (1 foto €5 / 3 voor €12 / 5 voor €18). Foto's worden na **30 dagen auto-gearchiveerd**.
- **Personal-portals** (familieshoots): één klant met eigen code, hogere resolutie preview (2000px breed met watermerk), kan kiezen tussen digitale pakketten (€10 / €25 / €40) of fysieke afdrukken. Geen auto-archief; handmatig wanneer klanten klaar zijn.

**Tech stack**: Next.js 16 App Router, React 19, TypeScript, Tailwind. Backend: Upstash Redis voor state, Cloudinary voor foto-opslag + transformaties, Resend voor mail. Deploys op Vercel.

**Status**: 17 mei 2026 eerste Hyrox-event gedraaid, €70 verkocht. Volgende: feest 20 juni, tennistoernooi (5 dagen) begin juli.

## Belangrijke locaties in de codebase

```
src/
  app/
    admin/                 # admin sectie (noindex + auth guard)
      clients/             # klantbeheer (lijst + detail + nieuwe)
      orders/              # bestellingen overzicht
      reviews/             # review-flow voor personal
      stats/               # Umami-dashboard (verborgen, API achter Pro nu)
    api/
      clients/[id]/        # client CRUD + photos + likes + favorites + feedback + cover + preview-token + visit + archive
      orders/              # POST/GET, PATCH/DELETE per order
      cron/
        review-requests/   # dagelijks 10:00 UTC, review-mails 3d na opleveren
        archive-events/    # dagelijks 11:00 UTC, auto-cleanup event foto's na 30d
      upload/signature/    # signed Cloudinary upload (browser direct naar CDN)
      events/              # losstaande events-feature (popup + requestable)
      stats/               # Umami-aggregatie (verborgen)
    gallery/[clientId]/    # publieke klant-portal
  lib/
    auth.ts                # jose JWT auth, getAdminSession + getClientOrPreviewSession
    redis.ts               # Upstash client
    cloudinary.ts          # Cloudinary config
    types.ts               # alle interfaces (Client, Order, Photo, Event, Feedback)
    reviews.ts             # review-cron logica
    archive.ts             # archief-cron + handmatige archive logica
    eventPackages.ts       # pricing-tier en greedy package calculation
    umami.ts               # Umami API wrapper (niet actief gebruikt)
  components/
    PhotoGrid + PhotoModal + OrderCart + NamePrompt
```

## Env vars in Vercel (productie)

```
ADMIN_PASSWORD               # login password
NEXTAUTH_SECRET              # JWT signing
KV_REST_API_URL              # Upstash
KV_REST_API_TOKEN            # Upstash
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
RESEND_API_KEY               # voor mail
CRON_SECRET                  # voor /api/cron/* endpoints
UMAMI_API_TOKEN              # NIET ACTIEF (Umami zette API achter Pro plan)
UMAMI_WEBSITE_ID             # f5b1ba87-7a89-4ce7-ac00-39dab461a58c
```

## Cron-jobs (vercel.json)

```
review-requests   0 10 * * *   # 10:00 UTC dagelijks
archive-events    0 11 * * *   # 11:00 UTC dagelijks
```

Beide endpoints accepteren drie auth-paden:
1. Vercel's `Authorization: Bearer ${CRON_SECRET}` header (productie)
2. `?token=XXX` URL-parameter (externe cron-services)
3. Admin-sessie (handmatige trigger via UI)

## Wat er sinds de Hyrox van 17 mei is gebouwd

**Klantbeheer**
- Inline bewerken van naam + e-mail in admin (`PATCH /api/clients/[id]`)
- Klant verwijderen met Cloudinary + Redis cleanup (incl. visit-stats, likes, favorites, feedback)
- Klant-dashboard gesplitst in **Actief** / **Afgehandeld** tabs (op basis van `archivedAt`)

**Bestellingen**
- Order verwijderen-knop in admin/orders (DELETE bestond al server-side)
- Generieke review-tekst (was specifiek voor "atleten en clubs", nu universeel)
- 4e stap in event-gallery banner: Google review CTA

**Cron + automatisering**
- `vercel.json` met automatische daily crons (review + archive)
- Review-cron krijgt handmatige trigger-knop op `/admin/reviews`
- Auto-archief flow: warning-mail dag 23, archief dag 30 (event-portals only)
- Personal-portals: alleen handmatige archief-knop, geen auto-cleanup
- Auto-unarchive zodra admin nieuwe foto's gaat uploaden (signature endpoint reset `archivedAt`)

**Foto's**
- Watermerk integratie (Cloudinary overlay `watermerk_vir9aa`, 30% breed, gravity south)
- Personal portals krijgen hogere resolutie preview (2000px breed) vs event (1200px)
- EXIF DateTimeOriginal opvragen via `image_metadata` Cloudinary feature
- Datum-filter chips in gallery (alleen bij 2+ unieke dagen)
- Tijdslot-chips onder de dag-chip (ochtend/middag/avond, alleen als 2+ slots foto's hebben)
- Friendly "Foto's niet meer beschikbaar" message bij gearchiveerde clients
- Debug endpoint `/api/clients/[id]/photos/debug` voor EXIF-troubleshooting

**Visit tracking**
- POST `/api/clients/[id]/visit` registreert gallery-bezoek (skipt admin/preview)
- Admin-klantpagina toont "Portaalbezoek: 7x · laatst 2 dagen geleden" of "nog niet geopend" (rood)

**SEO en privacy**
- `noindex` op `/gallery/*` en `/admin/*` via layout-metadata
- `public/robots.txt` met disallow voor /admin/, /gallery/, /api/, /login

**Stats (verborgen)**
- Umami integratie met sessies/events/spookverkeer (`/admin/stats`)
- Niet meer bereikbaar vanuit nav (Umami zette API achter Pro plan mid-2026)
- Code blijft staan voor toekomstige self-hosted Umami

**Andere**
- Stripe-integratie gebouwd en weer teruggedraaid (KVK nodig voor live keys)
- E-mail-filter advies voor Gmail (notificatie per bestelling)

## Bekende issues en heads-ups

**Linux mount sync delay**: bij dit project bleek de Linux-side van de file-mount soms achter te lopen op Windows. Edit-tool werkt op Windows-side, maar `tsc` draait op Linux-side. Soms moet je via heredoc/bash forceren. Niet leuk maar werkbaar.

**Cloudinary bandwidth**: free tier = 25 credits/maand. Eind mei zat hij op 8.9% gebruikt na de Hyrox. Per event ~2 credits (storage + bandwidth + transformations). Tennistoernooi van 5 dagen kan oplopen tot 14 credits. Archief-flow houdt het in toom.

**EXIF werkt alleen voor nieuwe uploads** na de fix (sinds eind juni). Oude uploads hebben geen EXIF in Cloudinary opgeslagen, die vallen terug op upload-tijd.

**Niet-camera foto's** (logos, screenshots, stock images) hebben geen EXIF DateTimeOriginal en vallen ook terug.

## Open items en nice-to-haves

- **Mollie of Stripe integratie**: zodra KVK rond is. Stripe-code is al eens gebouwd en weer weggehaald, kan terug.
- **Self-hosted Umami**: als hij echt analytics-data wil, deploy Umami op Vercel + Postgres.
- **GoatCounter migratie**: alternatief voor Umami met gratis API.
- **Funnel analyse / bounce rates**: voor wanneer er meer data is.
- **OG image** voor social previews.
- **Mollie of Stripe webhooks** voor automatische "paid" status.
- **Per-uur tijdslot-blokken** (i.p.v. ochtend/middag/avond) als dat finer moet voor tennistoernooi.

## Conventies voor de volgende AI

- **Nederlands, casual**: "je" niet "u", "mn" voor "mijn" mag, "ff" voor "even" prima.
- **Geen em-dashes** (—). Wel hyphens (-) of en-dashes (–).
- **Bestaande admin-palette**: groen `#053221`, goud `#c8a96e`, gray `#4a6358`, light `#e8ede9`. Brand-paletten in user-vraag (#c39d30 etc.) waren voor bjay.photo marketing-site, niet voor deze admin-app.
- **Auth-patroon**: server endpoints checken `getAdminSession()` (admin-only) of `canActAsClient(clientId, req)` (client of admin).
- **Redis keys** voor een client: `client:${code}`, `client:${code}:likes`, `:favorites`, `:feedback`, `:cover`, `:lastVisit`, `:visitCount`. Deze allemaal opruimen bij client-delete.
- **TSC moet altijd clean zijn** voor commit. `npx tsc --noEmit` als sanity check.
- **Bij grote Edit-bewerkingen**: bewust zijn van de Linux-sync-issue, anders TSC errors over truncated files. Optie: head + heredoc append + cp.

## Veel succes

Bert-Jan is een betrouwbare bouwpartner. Pragmatisch, kan goed prioriteren, niet bang om iets weg te halen wat niet werkt (Stripe revert was hij meteen mee eens). Vraagt om scope-vragen vooraf is fijn, niet overdrijven met dialogen.
