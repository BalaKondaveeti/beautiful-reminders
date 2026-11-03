export type Kind = 'deadline' | 'habit' | 'passive' | 'collection' | 'task'
export type Status = 'want' | 'active' | 'done'

export interface Goal {
  id: string
  user_id: string
  created_at: string
  parent_id: string | null
  kind: Kind
  title: string
  notes: string | null
  emoji: string | null
  due_date: string | null // YYYY-MM-DD
  start_date: string // YYYY-MM-DD
  status: Status
  completed_at: string | null
  archived: boolean
  position: number
}

export interface Checkin {
  id: string
  user_id: string
  created_at: string
  goal_id: string
  date: string // YYYY-MM-DD
  note: string | null
}

export const KINDS: Kind[] = ['deadline', 'habit', 'passive', 'collection', 'task']

export const KIND_INFO: Record<Kind, { label: string; blurb: string }> = {
  deadline: { label: 'Deadline', blurb: 'Has a due date. Shows how many days are left.' },
  habit: { label: 'Habit', blurb: 'Something you do every day. Tracks your streak.' },
  passive: { label: 'Long-term', blurb: 'No due date. A list of steps you work through over time.' },
  collection: { label: 'Collection', blurb: 'A group of goals, like skills to learn. Each one is tracked on its own.' },
  task: { label: 'Task', blurb: 'A single thing to do. Tick it off when it’s done.' },
}
