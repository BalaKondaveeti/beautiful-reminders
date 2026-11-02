import { addDays, diffDays, fmtDate, fmtTimestamp, todayISO } from './dates'
import type { Checkin, Goal } from './types'

export interface Countdown {
  state: 'none' | 'left' | 'today' | 'overdue' | 'done'
  days: number
  label: string
  weeks?: string
}

export function countdown(g: Goal, today = todayISO()): Countdown {
  if (g.status === 'done') {
    return { state: 'done', days: 0, label: g.completed_at ? `Achieved ${fmtTimestamp(g.completed_at)}` : 'Achieved' }
  }
  if (!g.due_date) return { state: 'none', days: 0, label: 'No date' }
  const d = diffDays(today, g.due_date)
  if (d === 0) return { state: 'today', days: 0, label: 'Due today' }
  if (d < 0) {
    const n = -d
    return { state: 'overdue', days: n, label: `${n} ${n === 1 ? 'day' : 'days'} overdue` }
  }
  const weeks = Math.floor(d / 7)
  return {
    state: 'left',
    days: d,
    label: `${d} ${d === 1 ? 'day' : 'days'} left`,
    weeks: d >= 14 ? `≈ ${weeks} weeks` : undefined,
  }
}

/** Fraction of the time window used, clamped 0..1. null when no window. */
export function timeUsed(g: Goal, today = todayISO()): number | null {
  if (!g.due_date) return null
  const total = diffDays(g.start_date, g.due_date)
  if (total <= 0) return 1
  const used = diffDays(g.start_date, today) / total
  return Math.min(1, Math.max(0, used))
}

export function dueLabel(g: Goal): string {
  return g.due_date ? fmtDate(g.due_date) : ''
}

/** Direct children that count toward progress: not habits, not archived. */
export function stepProgress(children: Goal[]): { done: number; total: number } {
  const steps = children.filter((c) => c.kind !== 'habit' && !c.archived)
  return { done: steps.filter((c) => c.status === 'done').length, total: steps.length }
}

export interface HabitStats {
  doneToday: boolean
  streak: number
  best: number
  rate: number // 0..1
  days: number
}

export function habitStats(g: Goal, dates: Set<string>, today = todayISO()): HabitStats {
  const doneToday = dates.has(today)

  // Current streak: from today, or from yesterday if today isn't ticked yet.
  let streak = 0
  let d = doneToday ? today : addDays(today, -1)
  while (dates.has(d)) {
    streak++
    d = addDays(d, -1)
  }

  // Best streak over all check-ins (past and today; future days are ignored).
  const sorted = [...dates].filter((x) => x <= today).sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const x of sorted) {
    run = prev && diffDays(prev, x) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = x
  }

  // Completion rate since start_date (or the earliest check-in, if earlier).
  let start = g.start_date
  if (sorted.length && sorted[0] < start) start = sorted[0]
  const days = Math.max(1, diffDays(start, today) + 1)
  const inWindow = sorted.filter((x) => x >= start).length
  return { doneToday, streak, best, rate: Math.min(1, inWindow / days), days }
}

export function checkinDates(checkins: Checkin[]): Set<string> {
  return new Set(checkins.map((c) => c.date))
}
