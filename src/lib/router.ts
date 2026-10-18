import { useSyncExternalStore } from 'react'

/** Minimal hash router: `#/trip/abc/itinerary?day=2`. */
export interface Route {
  path: string
  parts: string[]
  query: URLSearchParams
}

const read = () => window.location.hash.replace(/^#/, '')

/**
 * The marketing page owns the empty hash and in-page anchors like `#how-it-works`;
 * every app route starts with `/`.
 */
export const isLandingPath = (path: string) => !path.startsWith('/') || path === '/'

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useRoute(): Route {
  const raw = useSyncExternalStore(subscribe, read, () => '')
  const [path, qs = ''] = raw.split('?')
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs) }
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const url = `#${to}`
  if (opts.replace) {
    window.history.replaceState(null, '', url)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = to
  }
  window.scrollTo(0, 0)
}

/** Update query params on the current route without adding history. */
export function setQuery(patch: Record<string, string | null>) {
  const [path, qs = ''] = read().split('?')
  const q = new URLSearchParams(qs)
  Object.entries(patch).forEach(([k, v]) => (v === null ? q.delete(k) : q.set(k, v)))
  const s = q.toString()
  window.history.replaceState(null, '', `#${path}${s ? `?${s}` : ''}`)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

export function goBack(fallback: string) {
  if (window.history.length > 1) window.history.back()
  else navigate(fallback)
}
