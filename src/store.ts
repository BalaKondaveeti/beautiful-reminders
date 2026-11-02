// Data layer: local-first cache + one ordered write queue to Supabase.
//
// - All rows are loaded on sign-in (paged 1000 at a time) and cached in
//   localStorage per user, so the app opens instantly.
// - Every change is applied locally at once and appended to a persisted queue.
//   Text edits wait ~600 ms (and coalesce) before they're sent.
// - Network errors / 5xx keep the queue and surface a notice with Retry.

import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { todayISO } from './dates'
import type { Checkin, Goal } from './types'

type Op =
  | { t: 'upsertGoal'; id: string; row: Goal; readyAt: number }
  | { t: 'updateGoal'; id: string; patch: Partial<Goal>; readyAt: number }
  | { t: 'deleteGoal'; id: string; readyAt: number }
  | { t: 'upsertCheckin'; id: string; row: Checkin; readyAt: number }
  | { t: 'updateCheckin'; id: string; patch: Partial<Checkin>; readyAt: number }
  | { t: 'deleteCheckin'; id: string; readyAt: number }

export type SyncState = 'idle' | 'saving' | 'saved' | 'offline'

export interface State {
  userId: string | null
  email: string | null
  goals: Record<string, Goal>
  checkins: Record<string, Checkin>
  hasData: boolean // cache or server data present
  loading: boolean
  schemaMissing: boolean
  sync: SyncState
  pending: number
  problem: { kind: 'network' | 'write'; message: string } | null
  lastLoaded: number | null
}

const DEBOUNCE_MS = 600

let state: State = {
  userId: null,
  email: null,
  goals: {},
  checkins: {},
  hasData: false,
  loading: false,
  schemaMissing: false,
  sync: 'idle',
  pending: 0,
  problem: null,
  lastLoaded: null,
}
let queue: Op[] = []
let running = false
let inFlight: Op | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let savedTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  emit()
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => sel(state),
  )
}

export const getState = () => state

// ---------- persistence ----------

const cacheKey = (uid: string) => `br-cache-v1:${uid}`
const queueKey = (uid: string) => `br-queue-v1:${uid}`

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function safeSet(key: string, val: string) {
  try {
    localStorage.setItem(key, val)
  } catch {
    /* storage full or blocked: the app still works from memory */
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null
function persistCache() {
  if (!state.userId) return
  if (persistTimer) clearTimeout(persistTimer)
  const uid = state.userId
  persistTimer = setTimeout(() => {
    safeSet(cacheKey(uid), JSON.stringify({ goals: Object.values(state.goals), checkins: Object.values(state.checkins) }))
  }, 150)
}

function persistQueue() {
  if (!state.userId) return
  safeSet(queueKey(state.userId), JSON.stringify(queue))
  set({ pending: queue.length })
}

// ---------- session ----------

export function startSession(userId: string, email: string | null) {
  if (state.userId === userId) return
  let goals: Record<string, Goal> = {}
  let checkins: Record<string, Checkin> = {}
  let hasData = false
  const raw = safeGet(cacheKey(userId))
  if (raw) {
    try {
      const c = JSON.parse(raw) as { goals: Goal[]; checkins: Checkin[] }
      goals = Object.fromEntries(c.goals.map((g) => [g.id, g]))
      checkins = Object.fromEntries(c.checkins.map((x) => [x.id, x]))
      hasData = true
    } catch {
      /* ignore a corrupt cache */
    }
  }
  try {
    queue = JSON.parse(safeGet(queueKey(userId)) || '[]')
  } catch {
    queue = []
  }
  state = { ...state, userId, email, goals, checkins, hasData, schemaMissing: false, problem: null, pending: queue.length }
  emit()
  void refresh()
  kick()
}

export function endSession() {
  if (timer) clearTimeout(timer)
  queue = []
  state = { ...state, userId: null, email: null, goals: {}, checkins: {}, hasData: false, pending: 0, problem: null, sync: 'idle' }
  emit()
}

export function clearUserCache(uid: string) {
  try {
    localStorage.removeItem(cacheKey(uid))
    localStorage.removeItem(queueKey(uid))
  } catch {
    /* ignore */
  }
}

// ---------- loading ----------

function isSchemaMissing(err: { code?: string; message?: string } | null, status: number): boolean {
  if (!err) return false
  if (err.code === 'PGRST205' || err.code === '42P01' || err.code === 'PGRST202') return true
  if (status === 404 && /relation|schema cache|does not exist|not find/i.test(err.message || '')) return true
  return /relation .* does not exist|Could not find the table/i.test(err.message || '')
}

async function fetchAll<T>(table: 'br_goals' | 'br_checkins'): Promise<T[]> {
  const out: T[] = []
  const page = 1000
  for (let from = 0; ; from += page) {
    const { data, error, status } = await supabase.from(table).select('*').order('id', { ascending: true }).range(from, from + page - 1)
    if (error) throw Object.assign(new Error(error.message), { pg: error, status })
    out.push(...((data as T[]) ?? []))
    if (!data || data.length < page) break
  }
  return out
}

export async function refresh() {
  const uid = state.userId
  if (!uid || state.loading) return
  set({ loading: true })
  try {
    const [goals, checkins] = await Promise.all([fetchAll<Goal>('br_goals'), fetchAll<Checkin>('br_checkins')])
    if (state.userId !== uid) return
    const g: Record<string, Goal> = Object.fromEntries(goals.map((x) => [x.id, x]))
    const c: Record<string, Checkin> = Object.fromEntries(checkins.map((x) => [x.id, x]))
    // Re-apply writes that haven't reached the server yet so they aren't lost.
    for (const op of inFlight ? [inFlight, ...queue] : queue) applyOp(g, c, op)
    state = { ...state, goals: g, checkins: c, hasData: true, loading: false, schemaMissing: false, lastLoaded: Date.now() }
    const wasOffline = state.problem?.kind === 'network'
    if (wasOffline) state.problem = null
    emit()
    persistCache()
    // Supabase is reachable again: send anything that was waiting.
    if (wasOffline && queue.length) kick()
  } catch (e) {
    const err = e as Error & { pg?: { code?: string; message?: string }; status?: number }
    if (state.userId !== uid) return
    if (isSchemaMissing(err.pg ?? null, err.status ?? 0)) {
      set({ loading: false, schemaMissing: true })
    } else {
      set({ loading: false, problem: { kind: 'network', message: friendly(err.message, err.status) } })
    }
  }
}

function friendly(msg: string, status?: number): string {
  if (!status || status >= 500 || /fetch|network|load failed/i.test(msg))
    return "Can't reach Supabase. Free projects pause after about a week idle."
  return msg
}

function applyOp(g: Record<string, Goal>, c: Record<string, Checkin>, op: Op) {
  switch (op.t) {
    case 'upsertGoal':
      g[op.id] = { ...g[op.id], ...op.row }
      break
    case 'updateGoal':
      if (g[op.id]) g[op.id] = { ...g[op.id], ...op.patch }
      break
    case 'deleteGoal': {
      const gone = descendants(g, op.id)
      gone.add(op.id)
      for (const id of gone) delete g[id]
      for (const x of Object.values(c)) if (gone.has(x.goal_id)) delete c[x.id]
      break
    }
    case 'upsertCheckin':
      for (const x of Object.values(c)) if (x.goal_id === op.row.goal_id && x.date === op.row.date && x.id !== op.id) delete c[x.id]
      c[op.id] = { ...c[op.id], ...op.row }
      break
    case 'updateCheckin':
      if (c[op.id]) c[op.id] = { ...c[op.id], ...op.patch }
      break
    case 'deleteCheckin':
      delete c[op.id]
      break
  }
}

function descendants(g: Record<string, Goal>, id: string): Set<string> {
  const out = new Set<string>()
  const stack = [id]
  while (stack.length) {
    const cur = stack.pop()!
    for (const x of Object.values(g)) {
      if (x.parent_id === cur && !out.has(x.id)) {
        out.add(x.id)
        stack.push(x.id)
      }
    }
  }
  return out
}

// ---------- queue ----------

function enqueue(op: Op) {
  // Apply locally first.
  const g = { ...state.goals }
  const c = { ...state.checkins }
  applyOp(g, c, op)
  state = { ...state, goals: g, checkins: c }

  // Coalesce simple field edits into the last pending op for the same row.
  // (parent changes are never merged backwards, to keep FK order safe.)
  let merged = false
  if ((op.t === 'updateGoal' && !('parent_id' in op.patch)) || op.t === 'updateCheckin') {
    for (let i = queue.length - 1; i >= 0; i--) {
      const q = queue[i]
      if (q.id !== op.id) continue
      if (op.t === 'updateGoal' && (q.t === 'updateGoal' || q.t === 'upsertGoal')) {
        if (q.t === 'updateGoal') q.patch = { ...q.patch, ...op.patch }
        else q.row = { ...q.row, ...op.patch }
        q.readyAt = Math.max(q.readyAt, op.readyAt)
        merged = true
      } else if (op.t === 'updateCheckin' && (q.t === 'updateCheckin' || q.t === 'upsertCheckin')) {
        if (q.t === 'updateCheckin') q.patch = { ...q.patch, ...op.patch }
        else q.row = { ...q.row, ...op.patch }
        q.readyAt = Math.max(q.readyAt, op.readyAt)
        merged = true
      }
      break
    }
  }
  if (!merged) queue.push(op)
  persistQueue()
  persistCache()
  set({ sync: 'saving' })
  kick()
}

function kick() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  void run()
}

async function run() {
  if (running || !state.userId) return
  if (state.problem?.kind === 'network' && queue.length && !retrying) return
  running = true
  let sent = 0
  try {
    while (queue.length) {
      const head = queue[0]
      const wait = head.readyAt - Date.now()
      if (wait > 0) {
        timer = setTimeout(kick, wait)
        return
      }
      queue.shift()
      inFlight = head
      persistQueue()
      set({ sync: 'saving' })
      const res = await send(head)
      inFlight = null
      sent++
      if (res === 'retry') {
        queue.unshift(head)
        persistQueue()
        set({ sync: 'offline' })
        return
      }
    }
    if (!sent) {
      if (state.sync === 'saving') set({ sync: 'idle' })
      return
    }
    set({ sync: 'saved' })
    if (state.problem?.kind === 'network') set({ problem: null })
    if (savedTimer) clearTimeout(savedTimer)
    savedTimer = setTimeout(() => {
      if (state.sync === 'saved') set({ sync: 'idle' })
    }, 2000)
  } finally {
    running = false
    retrying = false
  }
}

let retrying = false
export function retry() {
  retrying = true
  set({ problem: null })
  for (const q of queue) q.readyAt = 0
  kick()
  void refresh()
}

export function flush() {
  if (!queue.length) return
  for (const q of queue) q.readyAt = 0
  persistQueue()
  kick()
}

async function send(op: Op): Promise<'ok' | 'retry' | 'dropped'> {
  let r: { error: { code?: string; message: string } | null; status: number }
  try {
    switch (op.t) {
      case 'upsertGoal':
        r = await supabase.from('br_goals').upsert(op.row, { onConflict: 'id' })
        break
      case 'updateGoal':
        r = await supabase.from('br_goals').update(op.patch).eq('id', op.id)
        break
      case 'deleteGoal':
        r = await supabase.from('br_goals').delete().eq('id', op.id)
        break
      case 'upsertCheckin':
        // Clear any other row for the same habit+day first (unique constraint).
        r = await supabase.from('br_checkins').delete().eq('goal_id', op.row.goal_id).eq('date', op.row.date).neq('id', op.id)
        if (!r.error) r = await supabase.from('br_checkins').upsert(op.row, { onConflict: 'id' })
        break
      case 'updateCheckin':
        r = await supabase.from('br_checkins').update(op.patch).eq('id', op.id)
        break
      case 'deleteCheckin':
        r = await supabase.from('br_checkins').delete().eq('id', op.id)
        break
    }
  } catch (e) {
    r = { error: { message: (e as Error).message }, status: 0 }
  }
  if (!r.error) return 'ok'
  const status = r.status
  if (status === 0 || status >= 500 || status === 408 || status === 429) {
    set({ problem: { kind: 'network', message: friendly(r.error.message, status) } })
    return 'retry'
  }
  if (status === 401) {
    const { error } = await supabase.auth.refreshSession()
    if (!error) return send(op)
    set({ problem: { kind: 'network', message: 'Your session expired. Sign in again to save changes.' } })
    return 'retry'
  }
  if (isSchemaMissing(r.error, status)) {
    set({ schemaMissing: true })
    return 'retry'
  }
  // A permanent error (constraint, permissions): drop it so the queue moves on.
  set({ problem: { kind: 'write', message: `A change couldn't be saved: ${r.error.message}` } })
  return 'dropped'
}

export function dismissProblem() {
  set({ problem: null })
}

// ---------- public mutations ----------

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function createGoal(fields: Partial<Goal> & Pick<Goal, 'kind' | 'title'>): Goal {
  const uid = state.userId!
  const siblings = Object.values(state.goals).filter((g) => g.parent_id === (fields.parent_id ?? null))
  const row: Goal = {
    id: newId(),
    user_id: uid,
    created_at: new Date().toISOString(),
    parent_id: null,
    notes: null,
    emoji: null,
    due_date: null,
    start_date: todayISO(),
    status: 'active',
    completed_at: null,
    archived: false,
    position: siblings.reduce((m, s) => Math.max(m, s.position + 1), 0),
    ...fields,
  }
  enqueue({ t: 'upsertGoal', id: row.id, row, readyAt: 0 })
  return row
}

export function updateGoal(id: string, patch: Partial<Goal>, opts: { debounce?: boolean } = {}) {
  if (!state.goals[id]) return
  enqueue({ t: 'updateGoal', id, patch, readyAt: opts.debounce ? Date.now() + DEBOUNCE_MS : 0 })
}

export function setStatus(id: string, status: Goal['status']) {
  const g = state.goals[id]
  if (!g) return
  updateGoal(id, {
    status,
    completed_at: status === 'done' ? (g.status === 'done' ? g.completed_at : new Date().toISOString()) : null,
  })
}

export function deleteGoal(id: string) {
  enqueue({ t: 'deleteGoal', id, readyAt: 0 })
}

export function toggleCheckin(goalId: string, date: string, on: boolean) {
  const existing = Object.values(state.checkins).find((c) => c.goal_id === goalId && c.date === date)
  if (on && !existing) {
    const row: Checkin = {
      id: newId(),
      user_id: state.userId!,
      created_at: new Date().toISOString(),
      goal_id: goalId,
      date,
      note: null,
    }
    enqueue({ t: 'upsertCheckin', id: row.id, row, readyAt: 0 })
  } else if (!on && existing) {
    enqueue({ t: 'deleteCheckin', id: existing.id, readyAt: 0 })
  }
}

export function setCheckinNote(id: string, note: string) {
  enqueue({ t: 'updateCheckin', id, patch: { note: note || null }, readyAt: Date.now() + DEBOUNCE_MS })
}

/** Goal + all descendants + their check-ins (for the delete confirmation). */
export function deleteImpact(id: string): { goals: number; checkins: number } {
  const d = descendants(state.goals, id)
  const all = new Set([...d, id])
  return { goals: d.size, checkins: Object.values(state.checkins).filter((c) => all.has(c.goal_id)).length }
}

export function descendantIds(id: string): Set<string> {
  return descendants(state.goals, id)
}

// Flush pending writes when the app is hidden or closed.
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
    else if (state.userId) {
      kick()
      // Opening the app again later: refresh quietly in the background.
      if (!state.lastLoaded || Date.now() - state.lastLoaded > 60_000) void refresh()
    }
  })
  window.addEventListener('pagehide', flush)
  window.addEventListener('online', () => {
    if (queue.length) retry()
  })
}
