// Web3Forms access key — een publieke form-key (geen server-secret), maar we
// houden 'm op één plek via env zodat hij niet hardcoded in meerdere bestanden
// staat. Zet WEB3FORMS_ACCESS_KEY in .env.local én in Vercel (productie).
export const WEB3FORMS_ACCESS_KEY = process.env.WEB3FORMS_ACCESS_KEY ?? ''
