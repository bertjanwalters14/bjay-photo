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
      clients/[id]/export/ # verhaal-export: URLs + gallery-snippet voor bjay.photo verhalen
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

**Verhaal-export (juni 2026)**
- Brug tussen portal en de statische site bjay.photo: foto's van een event/shoot exporteren voor een verhaal-pagina
- Admin-klantpagina: knop "Verhaal-export" zet selectie-modus aan; foto's aanklikken in gewenste volgorde (gouden rand + volgnummer), snelkeuzes "Top 15 meest geliket" en "Selecteer alles"
- `POST /api/clients/[id]/export` (admin-only): valideert slug + publicId-prefix, geeft per foto een Cloudinary-URL (webp, max 2000px, q82, ZONDER watermerk) plus gallery-snippet.html in het formaat van optimize-photos.py op de website
- Zip wordt client-side gebouwd met jszip (Vercel response-limiet is 4,5 MB, dus server-side zippen kan niet); browser fetcht direct van Cloudinary CDN, 4 tegelijk met voortgang
- Bestandsnamen: `<slug>-01.webp` etc.; zip uitpakken in `images/verhalen/<slug>/` op de website, snippet in de verhaal-pagina plakken
- Workflow-afspraak: verhalen tonen een selectie van 15-25 foto's (niet alles, dat kannibaliseert de foto-verkoop in het portal), met link naar het portal voor de volledige set

**Andere**
- Stripe-integratie gebouwd en weer teruggedraaid (KVK nodig voor live keys)
- E-mail-filter advies voor Gmail (notificatie per bestelling)
- App-favicon (`src/app/favicon.ico`) gelijkgetrokken met de website: groen BJAY-logo (bron `public/logo.png`) i.p.v. de oude gouden. Multi-size .ico via Pillow.
- Opschoning (juni 2026): ongebruikte Next-starter-SVG's uit `public/` weg (next/vercel/file/globe/window.svg), dode `src/app/lib/cloudinary.ts` weg (alle imports gebruiken `@/lib/cloudinary`). Web3Forms bleek server-side geblokkeerd (Cloudflare-403 op aanroepen vanaf Vercel), daarom volledig vervangen door **Resend**: de event-aanvraag-notificatie (`events.ts`, met `reply_to` = de aanvrager) en de review-mail (`reviews.ts`) gaan nu via Resend naar/vanaf info@bjay.photo. `web3forms.ts` is verwijderd; de env-var `WEB3FORMS_ACCESS_KEY` is niet meer nodig (mag uit Vercel + `.env.local`).
- Event-admin (juni 2026): aanvraag-notificatie toont nu altijd een leesbare naam (gedeelde `readableEventName` in `events.ts`, ook gebruikt door de requestable-route) i.p.v. "undefined" bij events zonder `name`. Op de galerij-pagina van een event-klant (`/admin/clients/[clientId]`) staan nu in de header knoppen voor het gekoppelde event: **Popup aanzetten/staat aan** (instant PATCH) + **Aanvragen (X)** (link naar de aanvragen-lijst). De koppeling galerij↔event gebeurt automatisch: match op `event.password === clientcode` óf slug-zonder-streepjes === code (bv. `hyrox-2026-heerenveen` ↔ `hyrox2026heerenveen`).
- Klantdatum + sortering (juni 2026): `Client` heeft nu een optioneel `date` (de event-/shootdatum, los van `createdAt`). In te vullen bij aanmaken (`/admin/clients/new`) en op de beheer-pagina (inline bewerken). Het dashboard sorteert de klantenlijst op deze datum, **nieuwste bovenaan**, met fallback op `createdAt` voor klanten zonder datum. De datum staat klein in elke rij.
- Personal-levering schoon (juni 2026): personal-galerijen tonen nu **schone foto's (geen watermerk)** en bieden per-foto download + een **"Download alle foto's"** (ZIP, client-side via jszip) op volle resolutie. Events blijven gewatermerkt tot betaling. `Photo` heeft een optioneel `downloadUrl` (schone origineel, alleen personal; bij events undefined). De **betaalde digitale-download/cart is uitgezet voor personal** (geen +-knop, geen cart-balk, geen "Digitaal bestellen" in de foto-popup); fysieke **afdrukken** blijven wél bestelbaar via de foto-weergave. Personal-banner: download-knop (geen prijs) + prominente **"tag @bjay.photo"**-vraag. Events houden de cart/checkout en het watermerk.
- Zoom in de foto-popup (juni 2026, `PhotoModal.tsx`): dubbelklik/dubbeltik om in/uit te zoomen (2.4x), slepen om te pannen, pinch op mobiel (1–4x), reset bij volgende/vorige foto en bij sluiten. Eigen lichte implementatie zonder library (i.v.m. React 19 peer-deps). Geldt voor personal én event (event blijft gewatermerkt).
- Toegangsmail (juni 2026): op de admin-klantpagina staat bij personal-klanten mét e-mail een knop **"Stuur toegangsmail"** → verstuurt via Resend (`src/lib/clientMail.ts`) een **HTML-mail** (groene huisstijl + logo `bjaylogofooter.png` als handtekening + website-link, plain-text fallback) met de inlogcode + link `app.bjay.photo/login?code=<code>` (de login vult de code voor uit `?code=`). `POST /api/clients/[id]/access-mail` (admin-only) zet `Client.accessMailSentAt`; knop wordt daarna "Opnieuw sturen". Bewust **handmatig** (knop) i.p.v. automatisch bij aanmaken, zodat 'ie pas gaat als de foto's er staan.
- Aanhef-veld (juni 2026): `Client.contactName` = voornaam/namen voor de mail-aanhef, los van de albumnaam `name` (bv. album "Feest Mick & Marieke", aanhef "Mick & Marieke"). In te vullen bij aanmaken + op de beheer-pagina (personal). De toegangsmail gebruikt `contactName` voor "Hoi ..."; leeg = eerste woord van `name` (oude gedrag).
- Gedeelde mail-stijl (juni 2026, `src/lib/email.ts`): `sendBrandedMail({to,subject,bodyHtml,bodyText,replyTo?})` verpakt klant-mails in de groene huisstijl + handtekening (logo via `app.bjay.photo/logoBJAYv3.0.png`, gehost in portal `public/`). Plus helpers `emailButton()` en `escapeHtml()`. Gebruikt door de **klant-mails**: toegangsmail (`clientMail.ts`), review-vraag (`reviews.ts`), bestelbevestiging (`orders`-route). De **interne meldingen** naar BJAY's eigen inbox (nieuwe-bestelling, archief-cron, event-aanvraag-notificatie) blijven bewust kale tekst. Alle klant-mails krijgen een verborgen **BCC** naar `bertjanwalters@gmail.com` (kopie voor BJAY + zelf zien hoe 't aankomt), constante `BCC` in `email.ts`.
- Mail-preview (juni 2026): admin-pagina `/admin/mail-preview` rendert alle klant-mails met test-data (verstuurt niets) om de huisstijl te checken. De mail-bodies zijn exporteerbaar gemaakt: `accessBodyHtml` (`clientMail.ts`), `buildReviewHtml` (`reviews.ts`), `orderConfirmationBodyHtml`/`orderConfirmationBodyText` (`orderMail.ts`), en `brandedHtml` (`email.ts`).
- Sneak peek-mail (juni 2026): tweede klant-mail naar hetzelfde portaal (zelfde inloglink + code), andere tekst (paar bewerkte favorieten vooraf, rest volgt). Knop **"Stuur sneak peek"** op de klantpagina naast de toegangsmail; `POST /api/clients/[id]/sneak-peek` zet `Client.sneakPeekSentAt`. `sneakPeekBodyHtml` + `sendSneakPeekMail` in `clientMail.ts`; staat ook in de mail-preview.
- Oplever-mail: persoonlijk bericht + betaalregel (juni 2026): `Client` heeft twee nieuwe optionele velden, `price` (alleen het getal, bv. "200") en `personalNote` (vrij bericht). Het bedrag-veld heeft een vast euroteken ervoor; de admin typt alleen het getal. `formatPrice()` in `src/lib/format.ts` (pure helper, veilig in client-bundle) maakt er de weergave van: "200" -> "€200,-", "199,50" -> "€199,50", idempotent op "€200,-". Gebruikt in de mail (`clientMail.ts`), de lees-weergave + live preview op de forms. Beide alleen voor personal en **alleen in de toegangs-/opleveringsmail** (niet de sneak peek). In te vullen bij aanmaken (`/admin/clients/new`) en op de beheer-pagina (inline bewerken, textarea voor het bericht); staan ook in de lees-weergave. In `accessBodyHtml`/`accessBodyText` (`clientMail.ts`): `personalNote` verschijnt als alinea direct na "Hoi ...," (regelovergangen blijven behouden, ge-escaped); `price` levert onderaan (boven de handtekening) een betaalregel op: "Het afgesproken bedrag voor de shoot is €X. Je kunt dit overmaken naar NL03 TRBK 0594 0453 11 t.n.v. Berend Jan-Geert Walters (dat ben ik, BJAY Fotografie), o.v.v. <albumnaam>." IBAN + tenaamstelling staan als constanten `IBAN`/`ACCOUNT_NAME` boven in `clientMail.ts` (niet per klant). Lege velden = regel/alinea valt weg. De mail-preview toont beide met voorbeelddata. Naam-keuze: bewust de volledige bank-tenaamstelling (Berend Jan-Geert Walters) i.v.m. de NL IBAN-naamcheck, met "(dat ben ik, BJAY Fotografie)" zodat de klant 'm herkent.
- Galerij personal vs event sortering/filter (juni 2026): de **datum-filter chips** (dag + tijdslot ochtend/middag/avond) in de galerij worden nu alleen nog bij **events** getoond (`isEvent && ...` in `gallery/[clientId]/page.tsx`). Personal-shoots tonen alle foto's als één doorlopend geheel, **chronologisch op opnamedatum**: de foto-API (`photos/route.ts`) sorteert voor personal op `createdAt` (EXIF-opnametijd, ISO, met upload-tijd als fallback) met de bestandsnaam als tiebreaker; events houden de natural sort op bestandsnaam zodat de datum-filter de dagen kan opsplitsen. Reden: een personal-shoot over meerdere dagen moet niet opgeknipt worden in dag-tabs.
- Galerij toonde lege (klikbare) vlakken bij veel foto's (juni 2026): bij een foto-zware galerij was het rooster onzichtbaar maar wél klikbaar (klik op "leeg vlak" opende de foto in de modal). **Echte oorzaak**: de scroll-reveal in `gallery/[clientId]/page.tsx`. Het rooster staat op `opacity: 0` en wordt zichtbaar gemaakt via een IntersectionObserver; die stond op `threshold: 0.05` (5% zichtbaar). Bij veel foto's is het rooster zo hoog dat er nooit 5% tegelijk in beeld past, dus de observer triggerde nooit en het bleef op opacity 0 (onzichtbaar maar interactief). Fix: `threshold: 0` — triggert zodra het rooster ook maar in beeld komt. Diagnose-tip: de thumbnail- én modal-URL gaven allebei gewoon `200 OK` + geldige JPEG terug (curl), dus het lag niet aan Cloudinary of de laad-URL maar aan de weergave (opacity).
- Omzet-tracking (juni 2026): nieuw overzicht **`/admin/revenue`** ("Omzet"-knop op het dashboard naast Bestellingen) dat alleen **ECHT ontvangen geld** optelt. Twee bronnen: (1) event/print-`Order`s met status `paid` of `shipped` (verzonden = al betaald), (2) personal shoots met ingevuld `Client.price` én gezette `Client.paidAt`. `Client` heeft daarvoor een nieuw optioneel `paidAt?: string | null`; op de admin-klantpagina staat bij personal-klanten mét bedrag een groene knop **"Markeer als betaald"** (PATCH `paidAt`, toggle, toont "betaald op <datum>"). Aggregatie server-side in `GET /api/revenue` (admin-only): totaal ontvangen, totaal dit jaar, split orders vs personal, per-maand-overzicht (orders op `createdAt`, personal op `paidAt`), plus een informatieve "nog openstaand" (personal mét bedrag zonder `paidAt`, telt NIET mee). Bedragen worden uit de opgeslagen prijs-tekst geparsed met nieuwe helper **`parsePrice()`** in `src/lib/format.ts` (spiegelbeeld van `formatPrice`), totalen getoond met **`formatEuros()`**. Reden createdAt voor orders: orders houden geen betaaldatum bij, alleen `updatedAt`. Bestaande betaalde orders tellen automatisch mee (geen migratie nodig).
- Thumbnails buiten Vercel-optimizer (juni 2026): los van bovenstaande is `images.unoptimized: true` gezet in `next.config.ts`. Cloudinary optimaliseert al (q_auto/f_auto/breedte in de URL), dus `next/image` hoeft er niet nog eens overheen. Alle thumbnails laden nu direct van Cloudinary (net als de modal die al een plain `<img>` gebruikte); scheelt Vercel-quota/kosten en voorkomt dat de optimizer omvalt bij honderden toernooi-foto's. (Was aanvankelijk als fix voor de lege vlakken bedoeld, maar bleek niet de oorzaak; toch behouden als terechte verbetering. `remotePatterns` voor res.cloudinary.com staat er nog, schaadt niet.)

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
