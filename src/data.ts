import { useMemo } from 'react'
import { useStore } from './store'
import type { Checkin, Goal } from './types'

export interface Index {
  goals: Record<string, Goal>
  checkins: Record<string, Checkin>
  children: Map<string | null, Goal[]> // sorted by position, archived included
  checkinsByGoal: Map<string, Checkin[]>
  datesByGoal: Map<string, Set<string>>
}

export function buildIndex(goals: Record<string, Goal>, checkins: Record<string, Checkin>): Index {
  const children = new Map<string | null, Goal[]>()
  for (const g of Object.values(goals)) {
    const key = g.parent_id ?? null
    const arr = children.get(key) ?? []
    arr.push(g)
    children.set(key, arr)
  }
  for (const arr of children.values())
    arr.sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))

  const checkinsByGoal = new Map<string, Checkin[]>()
  const datesByGoal = new Map<string, Set<string>>()
  for (const c of Object.values(checkins)) {
    const arr = checkinsByGoal.get(c.goal_id) ?? []
    arr.push(c)
    checkinsByGoal.set(c.goal_id, arr)
    const s = datesByGoal.get(c.goal_id) ?? new Set<string>()
    s.add(c.date)
    datesByGoal.set(c.goal_id, s)
  }
  return { goals, checkins, children, checkinsByGoal, datesByGoal }
}

export function useIndex(): Index {
  const goals = useStore((s) => s.goals)
  const checkins = useStore((s) => s.checkins)
  return useMemo(() => buildIndex(goals, checkins), [goals, checkins])
}

const EMPTY: Goal[] = []
const EMPTY_SET = new Set<string>()

export function kids(ix: Index, id: string | null, includeArchived = false): Goal[] {
  const arr = ix.children.get(id) ?? EMPTY
  return includeArchived ? arr : arr.filter((g) => !g.archived)
}

export function dates(ix: Index, goalId: string): Set<string> {
  return ix.datesByGoal.get(goalId) ?? EMPTY_SET
}

/** True when the goal or any ancestor is archived. */
export function hiddenByArchive(ix: Index, g: Goal): boolean {
  let cur: Goal | undefined = g
  let guard = 0
  while (cur && guard++ < 50) {
    if (cur.archived) return true
    cur = cur.parent_id ? ix.goals[cur.parent_id] : undefined
  }
  return false
}

export function ancestors(ix: Index, g: Goal): Goal[] {
  const out: Goal[] = []
  let cur = g.parent_id ? ix.goals[g.parent_id] : undefined
  let guard = 0
  while (cur && guard++ < 50) {
    out.unshift(cur)
    cur = cur.parent_id ? ix.goals[cur.parent_id] : undefined
  }
  return out
}

export function displayTitle(g: Goal): string {
  return g.title.trim() || 'Untitled'
}
