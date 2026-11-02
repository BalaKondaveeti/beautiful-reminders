import type { Kind } from '../types'

type P = { size?: number; className?: string }

const base = (size = 20) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export const IconBack = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
)
export const IconPencil = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" />
    <path d="M13.5 6.5l4 4" />
  </svg>
)
export const IconMore = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="5" cy="12" r="1.3" fill="currentColor" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    <circle cx="19" cy="12" r="1.3" fill="currentColor" />
  </svg>
)
export const IconPlus = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const IconCheck = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)
export const IconRefresh = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
    <path d="M4 4v4h4" />
    <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
    <path d="M20 20v-4h-4" />
  </svg>
)
export const IconSettings = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
)
export const IconArchive = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4" />
  </svg>
)
export const IconTrash = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
)
export const IconRestore = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6" />
    <path d="M4 4v4.6h4.6" />
  </svg>
)
export const IconChevron = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M9 5l7 7-7 7" />
  </svg>
)
export const IconFlame = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 21c-3.9 0-7-2.8-7-6.6 0-3.1 2.1-5.2 3.6-7 .4 1.7 1.3 2.8 2.4 3.2C11 7.3 12.6 4.6 15 3c-.3 2.6 1 4.5 2.4 6.2 1 1.3 1.6 2.9 1.6 4.8 0 4-3.1 7-7 7z" />
  </svg>
)
export const IconOut = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
)

export function KindIcon({ kind, size = 20, className }: { kind: Kind } & P) {
  const p = base(size)
  switch (kind) {
    case 'deadline':
      return (
        <svg {...p} className={className}>
          <path d="M7 3h10M7 21h10M8 3c0 4 8 5 8 9s-8 5-8 9M16 3c0 4-8 5-8 9" />
        </svg>
      )
    case 'habit':
      return (
        <svg {...p} className={className}>
          <path d="M20 12a8 8 0 1 1-3-6.2" />
          <path d="M20 4v4h-4" />
          <path d="M9 12.2l2 2 4-4.2" />
        </svg>
      )
    case 'passive':
      return (
        <svg {...p} className={className}>
          <path d="M3 19l6-10 4 6 3-4 5 8H3z" />
          <circle cx="17" cy="6" r="1.6" />
        </svg>
      )
    case 'collection':
      return (
        <svg {...p} className={className}>
          <rect x="4" y="4" width="7" height="7" rx="2" />
          <rect x="13" y="4" width="7" height="7" rx="2" />
          <rect x="4" y="13" width="7" height="7" rx="2" />
          <rect x="13" y="13" width="7" height="7" rx="2" />
        </svg>
      )
    case 'task':
      return (
        <svg {...p} className={className}>
          <rect x="4" y="4" width="16" height="16" rx="4" />
          <path d="M8.5 12.3l2.4 2.4 4.8-5" />
        </svg>
      )
  }
}
