import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { DASHBOARD_URL } from '../supabase'
import { dismissProblem, retry, updateGoal, useStore } from '../store'
import type { Goal, Kind } from '../types'
import { IconCheck, IconOut, KindIcon } from './icons'

export const kc = (kind: Kind) => `k-${kind}`

/* ---------- Check button (round, animated) ---------- */

export function CheckButton({
  checked,
  onToggle,
  kind = 'habit',
  size = 'md',
  label,
  disabled,
}: {
  checked: boolean
  onToggle: (next: boolean) => void
  kind?: Kind
  size?: 'md' | 'lg' | 'sm'
  label: string
  disabled?: boolean
}) {
  const [pop, setPop] = useState(false)
  return (
    <button
      type="button"
      className={`check check-${size} ${kc(kind)} ${checked ? 'is-on' : ''} ${pop ? 'pop' : ''}`}
      aria-pressed={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        if (!checked) setPop(true)
        onToggle(!checked)
      }}
      onAnimationEnd={() => setPop(false)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path className="check-mark" d="M6 12.5l4 4L18 8" pathLength={1} />
      </svg>
    </button>
  )
}

/* Square tick for steps/tasks */
export function TickBox({
  checked,
  onToggle,
  label,
  kind = 'task',
}: {
  checked: boolean
  onToggle: (next: boolean) => void
  label: string
  kind?: Kind
}) {
  const [pop, setPop] = useState(false)
  return (
    <button
      type="button"
      className={`tick ${kc(kind)} ${checked ? 'is-on' : ''} ${pop ? 'pop' : ''}`}
      aria-pressed={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        if (!checked) setPop(true)
        onToggle(!checked)
      }}
      onAnimationEnd={() => setPop(false)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path className="check-mark" d="M6 12.5l4 4L18 8" pathLength={1} />
      </svg>
    </button>
  )
}

/* ---------- Progress ring & bar ---------- */

export function Ring({
  value,
  size = 52,
  stroke = 5,
  kind,
  children,
}: {
  value: number
  size?: number
  stroke?: number
  kind: Kind
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  const gid = `rg-${kind}`
  return (
    <div className={`ring ${kc(kind)}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" className="ring-stop-a" />
            <stop offset="100%" className="ring-stop-b" />
          </linearGradient>
        </defs>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className="ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          stroke={`url(#${gid})`}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children && <div className="ring-label">{children}</div>}
    </div>
  )
}

export function Bar({ value, kind, thin, label }: { value: number; kind: Kind; thin?: boolean; label?: string }) {
  const v = Math.max(0, Math.min(1, value))
  return (
    <div
      className={`bar ${thin ? 'bar-thin' : ''} ${kc(kind)}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
    >
      <div className="bar-fill" style={{ transform: `scaleX(${v})` }} />
    </div>
  )
}

/* ---------- Emoji / kind badge ---------- */

export function Badge({ goal, size = 'md' }: { goal: Pick<Goal, 'emoji' | 'kind'>; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`badge badge-${size} ${kc(goal.kind)}`} aria-hidden="true">
      {goal.emoji ? <span className="badge-emoji">{goal.emoji}</span> : <KindIcon kind={goal.kind} />}
    </span>
  )
}

/* ---------- Sheet (bottom sheet / action menu) ---------- */

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-grip" />
        {title && <div className="sheet-title">{title}</div>}
        {children}
      </div>
    </div>
  )
}

export interface Action {
  label: string
  icon?: ReactNode
  danger?: boolean
  onClick: () => void
}

export function ActionSheet({ open, onClose, title, actions }: { open: boolean; onClose: () => void; title?: string; actions: Action[] }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="action-list">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            className={`action ${a.danger ? 'is-danger' : ''}`}
            onClick={() => {
              onClose()
              a.onClick()
            }}
          >
            {a.icon && <span className="action-icon">{a.icon}</span>}
            {a.label}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-ghost btn-block" onClick={onClose}>
        Cancel
      </button>
    </Sheet>
  )
}

export function ConfirmSheet({
  open,
  onClose,
  title,
  body,
  confirm,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  title: string
  body: ReactNode
  confirm: string
  onConfirm: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="sheet-body">{body}</div>
      <div className="sheet-actions">
        <button type="button" className="btn btn-danger btn-block" onClick={() => (onClose(), onConfirm())}>
          {confirm}
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Sheet>
  )
}

/* ---------- Auto-growing textarea ---------- */

export function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [props.value])
  return <textarea ref={ref} {...props} />
}

/* ---------- Notes box (autosaves) ---------- */

export function NotesBox({ goal }: { goal: Goal }) {
  const [value, setValue] = useState(goal.notes ?? '')
  const editing = useRef(false)
  // Pick up changes made elsewhere (refresh, other device) while not typing.
  useEffect(() => {
    if (!editing.current) setValue(goal.notes ?? '')
  }, [goal.notes, goal.id])
  return (
    <section className="section">
      <label className="section-title" htmlFor={`notes-${goal.id}`}>
        Notes
      </label>
      <AutoTextarea
        id={`notes-${goal.id}`}
        className="field notes"
        placeholder="Write anything: why it matters, what's next, what's working…"
        value={value}
        onFocus={() => (editing.current = true)}
        onBlur={() => (editing.current = false)}
        onChange={(e) => {
          setValue(e.target.value)
          updateGoal(goal.id, { notes: e.target.value || null }, { debounce: true })
        }}
      />
    </section>
  )
}

/* ---------- Sync status ---------- */

export function SyncPill() {
  const sync = useStore((s) => s.sync)
  const pending = useStore((s) => s.pending)
  if (sync === 'idle' && !pending) return null
  const text = sync === 'offline' ? `${pending} unsaved` : sync === 'saving' || pending ? 'Saving…' : 'Saved'
  return (
    <span className={`sync sync-${sync === 'offline' ? 'offline' : sync === 'saved' && !pending ? 'saved' : 'saving'}`} role="status">
      {sync === 'saved' && !pending && <IconCheck size={14} />}
      {text}
    </span>
  )
}

export function ProblemNotice() {
  const problem = useStore((s) => s.problem)
  const pending = useStore((s) => s.pending)
  if (!problem) return null
  if (problem.kind === 'write') {
    return (
      <div className="notice notice-warn" role="alert">
        <p>{problem.message}</p>
        <div className="notice-actions">
          <button type="button" className="btn btn-small" onClick={dismissProblem}>
            OK
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="notice" role="alert">
      <p>
        {problem.message}
        {pending > 0 && (
          <>
            {' '}
            Your {pending} {pending === 1 ? 'change is' : 'changes are'} kept on this phone and will be sent once it's back.
          </>
        )}
      </p>
      <div className="notice-actions">
        <a className="btn btn-small" href={DASHBOARD_URL} target="_blank" rel="noreferrer">
          Restore in Supabase <IconOut size={14} />
        </a>
        <button type="button" className="btn btn-small btn-primary" onClick={retry}>
          Retry
        </button>
      </div>
    </div>
  )
}

export function TopBar({ left, right, center }: { left?: ReactNode; right?: ReactNode; center?: ReactNode }) {
  return (
    <header className="topbar">
      <div className="topbar-side">{left}</div>
      <div className="topbar-center">{center}</div>
      <div className="topbar-side topbar-right">{right}</div>
    </header>
  )
}
