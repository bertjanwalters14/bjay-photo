// Client-side helper om preview-token uit de huidige URL door te geven aan API calls.
// Gebruikt door gallery / PhotoModal / OrderCart zodat een admin in preview-mode
// (?preview=...) ook kan liken / bestellen / reageren.

export function getPreviewToken(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('preview')
}

export function apiUrl(path: string): string {
  const token = getPreviewToken()
  if (!token) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}preview=${encodeURIComponent(token)}`
}
