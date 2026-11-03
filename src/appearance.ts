// Light / Dark / match the phone. Saved per device; defaults to Light.

export type Appearance = 'light' | 'dark' | 'system'

const KEY = 'br-appearance'
const BAR = { light: '#f2f3f5', dark: '#000000' } // status-bar colour, matches --bg

const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null

export function getAppearance(): Appearance {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* storage blocked: fall back to the default */
  }
  return 'light'
}

export function applyAppearance(a: Appearance = getAppearance()) {
  document.documentElement.dataset.theme = a
  const dark = a === 'dark' || (a === 'system' && !!media?.matches)
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
    m.setAttribute('content', dark ? BAR.dark : BAR.light)
    m.removeAttribute('media')
  }
}

export function setAppearance(a: Appearance) {
  try {
    localStorage.setItem(KEY, a)
  } catch {
    /* still applies for this visit */
  }
  applyAppearance(a)
}

// Keep the status bar right when the phone switches modes.
media?.addEventListener('change', () => {
  if (getAppearance() === 'system') applyAppearance('system')
})
