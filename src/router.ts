import { useSyncExternalStore } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'new'; parentId: string | null }
  | { name: 'goal'; id: string }
  | { name: 'edit'; id: string }
  | { name: 'archived' }
  | { name: 'settings' }

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/'
  let m: RegExpMatchArray | null
  if (path === '/new') return { name: 'new', parentId: null }
  if ((m = path.match(/^\/goal\/([^/]+)\/new$/))) return { name: 'new', parentId: m[1] }
  if ((m = path.match(/^\/goal\/([^/]+)\/edit$/))) return { name: 'edit', id: m[1] }
  if ((m = path.match(/^\/goal\/([^/]+)$/))) return { name: 'goal', id: m[1] }
  if (path === '/archived') return { name: 'archived' }
  if (path === '/settings') return { name: 'settings' }
  return { name: 'home' }
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash)
}

export function go(path: string, opts: { replace?: boolean } = {}) {
  const hash = '#' + path
  if (opts.replace) window.location.replace(hash)
  else window.location.hash = hash
}

export const goalPath = (id: string) => `/goal/${id}`
