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
  deadline: { label: 'Deadline', blurb: 'A goal with a target date and a countdown' },
  habit: { label: 'Habit', blurb: 'Something you do every day, with a streak' },
  passive: { label: 'Passive', blurb: 'Long-running, no date, no pressure' },
  collection: { label: 'Collection', blurb: 'A container of goals, each tracked on its own' },
  task: { label: 'Task', blurb: 'A simple step you tick off' },
}
