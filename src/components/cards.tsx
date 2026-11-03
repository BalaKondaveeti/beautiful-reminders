import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { countdown, habitStats, stepProgress, timeUsed } from '../calc'
import { addDays, fmtDate, todayISO, localDate } from '../dates'
import { dates, displayTitle, kids, type Index } from '../data'
import { go, goalPath } from '../router'
import { createGoal, setStatus, toggleCheckin } from '../store'
import type { Goal, Kind } from '../types'
import { IconChevron, IconPlus } from './icons'
import { Badge, Bar, CheckButton, TickBox, kc } from './ui'

const open = (g: Goal) => () => go(goalPath(g.id))

function cardKeys(g: Goal) {
  return {
    role: 'link' as const,
    tabIndex: 0,
    onClick: open(g),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        go(goalPath(g.id))
      }
    },
  }
}

/* ---------- One-line tracker summary for any goal ---------- */

export function summaryText(ix: Index, g: Goal): string {
  const children = kids(ix, g.id)
  if (g.status === 'done' && g.kind !== 'habit') return countdown(g).label
  switch (g.kind) {
    case 'deadline':
      return countdown(g).label
    case 'habit': {
      const s = habitStats(g, dates(ix, g.id))
      return `${s.doneToday ? 'Done today' : 'Not done today'}, ${streakText(s.streak).toLowerCase()}`
    }
    case 'collection': {
      const c = collectionCounts(children)
      return `${c.active} doing, ${c.want} want to, ${c.done} done`
    }
    default: {
      const p = stepProgress(children)
      return p.total ? `${p.done} of ${p.total} ${p.total === 1 ? 'step' : 'steps'} done` : g.status === 'want' ? 'Not started' : 'In progress'
    }
  }
}

export function collectionCounts(children: Goal[]) {
  return {
    active: children.filter((c) => c.status === 'active').length,
    want: children.filter((c) => c.status === 'want').length,
    done: children.filter((c) => c.status === 'done').length,
  }
}

/* ---------- Big days-left number ---------- */

export function DaysLeft({ goal, hero }: { goal: Goal; hero?: boolean }) {
  const cd = countdown(goal)
  const cls = hero ? 'days days-hero' : 'days'
  if (cd.state === 'done') return <div className={`${cls} is-done`}><span className="days-word">Achieved</span></div>
  if (cd.state === 'none') return <div className={cls}><span className="days-word">No date</span></div>
  if (cd.state === 'today')
    return (
      <div className={`${cls} is-today`}>
        <span className="days-word">Due today</span>
      </div>
    )
  return (
    <div className={`${cls} ${cd.state === 'overdue' ? 'is-overdue' : ''}`}>
      <span className="days-num">{cd.days}</span>
      <span className="days-unit">{cd.state === 'overdue' ? (cd.days === 1 ? 'day overdue' : 'days overdue') : cd.days === 1 ? 'day left' : 'days left'}</span>
    </div>
  )
}

/* ---------- Deadline card ---------- */

export function DeadlineCard({ ix, goal }: { ix: Index; goal: Goal }) {
  const p = stepProgress(kids(ix, goal.id))
  const used = timeUsed(goal)
  const cd = countdown(goal)
  return (
    <article className={`card card-deadline ${goal.status === 'done' ? 'is-done' : ''}`} {...cardKeys(goal)}>
      <div className="card-head">
        <Badge goal={goal} />
        <h3 className="card-title">{displayTitle(goal)}</h3>
      </div>
      <div className="deadline-mid">
        <DaysLeft goal={goal} />
        <div className="deadline-side">
          {cd.state === 'done' ? <span>{cd.label}</span> : goal.due_date && <span>Due {fmtDate(goal.due_date)}</span>}
          {p.total > 0 && (
            <span>
              {p.done} of {p.total} {p.total === 1 ? 'step' : 'steps'} done
            </span>
          )}
        </div>
      </div>
      {used !== null && goal.status !== 'done' && (
        <div className="time-used">
          <div className="time-used-row">
            <span>Time used</span>
            <span>{Math.round(used * 100)}%</span>
          </div>
          <Bar value={used} kind="deadline" thin label="Time used" />
        </div>
      )}
    </article>
  )
}

/* ---------- Habit: 7-day dots ---------- */

export function WeekDots({ goal, set }: { goal: Goal; set: Set<string> }) {
  const today = todayISO()
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  return (
    <div className={`dots ${kc(goal.kind === 'habit' ? 'habit' : goal.kind)}`} aria-label="Last 7 days">
      {days.map((d) => (
        <div key={d} className="dot-col">
          <span className={`dot ${set.has(d) ? 'is-on' : ''} ${d === today ? 'is-today' : ''}`} title={fmtDate(d)} />
          <span className="dot-day">{localDate(d).toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
        </div>
      ))}
    </div>
  )
}

export function HabitCard({ ix, goal }: { ix: Index; goal: Goal }) {
  const set = dates(ix, goal.id)
  const s = habitStats(goal, set)
  return (
    <article className={`card card-habit ${kc('habit')}`} {...cardKeys(goal)}>
      <div className="card-head">
        <Badge goal={goal} />
        <div className="card-head-text">
          <h3 className="card-title">{displayTitle(goal)}</h3>
          <div className="card-meta">
            {streakText(s.streak)}, done on {Math.round(s.rate * 100)}% of days
          </div>
        </div>
        <CheckButton checked={s.doneToday} onToggle={(v) => toggleCheckin(goal.id, todayISO(), v)} label={`Done today: ${goal.title}`} />
      </div>
      <WeekDots goal={goal} set={set} />
    </article>
  )
}

export function streakText(n: number): string {
  return n === 0 ? 'No streak yet' : `${n}-day streak`
}

export function Streak({ n }: { n: number }) {
  return <span className="streak">{streakText(n)}</span>
}

/* ---------- Habit row (Today list and inside goals) ---------- */

export function HabitRow({ ix, goal, showParent }: { ix: Index; goal: Goal; showParent?: boolean }) {
  const s = habitStats(goal, dates(ix, goal.id))
  const parent = goal.parent_id ? ix.goals[goal.parent_id] : undefined
  return (
    <div className={`row row-habit ${kc('habit')} ${s.doneToday ? 'is-done' : ''}`}>
      <CheckButton checked={s.doneToday} onToggle={(v) => toggleCheckin(goal.id, todayISO(), v)} label={`Done today: ${goal.title}`} />
      <button type="button" className="row-main" onClick={open(goal)}>
        <span className="row-title">
          {goal.emoji && <span className="row-emoji">{goal.emoji}</span>}
          {displayTitle(goal)}
        </span>
        <span className="row-sub">
          <Streak n={s.streak} />
          {showParent && parent && <span className="row-parent">{parent.emoji ? `${parent.emoji} ` : ''}{displayTitle(parent)}</span>}
        </span>
      </button>
      <IconChevron size={18} className="row-chev" />
    </div>
  )
}

/* ---------- Step row (task with a tick) ---------- */

export function StepRow({ ix, goal, kind = 'task' }: { ix: Index; goal: Goal; kind?: Kind }) {
  const done = goal.status === 'done'
  const sub = kids(ix, goal.id)
  const p = stepProgress(sub)
  const hasMore = !!goal.notes || sub.length > 0
  return (
    <div className={`row row-step ${done ? 'is-done' : ''}`}>
      <TickBox kind={kind} checked={done} onToggle={(v) => setStatus(goal.id, v ? 'done' : 'active')} label={`Done: ${goal.title}`} />
      <button type="button" className="row-main" onClick={open(goal)}>
        <span className="row-title">
          {goal.emoji && <span className="row-emoji">{goal.emoji}</span>}
          {displayTitle(goal)}
        </span>
        {hasMore && (
          <span className="row-sub">
            {p.total > 0 && `${p.done} of ${p.total}`}
            {p.total > 0 && <span>steps</span>}
            {goal.notes && <span>Has notes</span>}
          </span>
        )}
      </button>
      <IconChevron size={18} className="row-chev" />
    </div>
  )
}

/* ---------- Generic compact card for nested goals and collection items ---------- */

export function MiniCard({ ix, goal, right }: { ix: Index; goal: Goal; right?: ReactNode }) {
  const summary = summaryText(ix, goal)
  const cd = goal.kind === 'deadline' ? countdown(goal) : null
  return (
    <article className={`card card-mini ${kc(goal.kind)} ${goal.status === 'done' ? 'is-done' : ''}`} {...cardKeys(goal)}>
      <Badge goal={goal} />
      <div className="card-head-text">
        <h4 className="mini-title">{displayTitle(goal)}</h4>
        <div className={`card-meta ${cd?.state === 'overdue' ? 'is-overdue' : ''}`}>{summary}</div>
      </div>
      {goal.kind === 'habit' && (
        <CheckButton
          size="sm"
          checked={dates(ix, goal.id).has(todayISO())}
          onToggle={(v) => toggleCheckin(goal.id, todayISO(), v)}
          label={`Done today: ${goal.title}`}
        />
      )}
      {right}
    </article>
  )
}

/* ---------- Collection card ---------- */

export function CollectionCard({ ix, goal }: { ix: Index; goal: Goal }) {
  const children = kids(ix, goal.id)
  const c = collectionCounts(children)
  const chips = [...children.filter((x) => x.status === 'active'), ...children.filter((x) => x.status === 'want')].slice(0, 4)
  return (
    <article className={`card card-collection ${kc('collection')}`} {...cardKeys(goal)}>
      <div className="card-head">
        <Badge goal={goal} />
        <h3 className="card-title">{displayTitle(goal)}</h3>
      </div>
      <p className="card-meta">
        {c.active} doing, {c.want} want to, {c.done} done
      </p>
      {chips.length > 0 && (
        <div className="chips">
          {chips.map((x) => (
            <span key={x.id} className={`chip ${kc(x.kind)} ${x.status === 'want' ? 'is-want' : ''}`}>
              {x.emoji && <span>{x.emoji}</span>}
              {displayTitle(x)}
            </span>
          ))}
          {children.length - c.done > chips.length && <span className="chip chip-more">+{children.length - c.done - chips.length}</span>}
        </div>
      )}
    </article>
  )
}

/* ---------- Passive card (quiet) ---------- */

export function PassiveCard({ ix, goal }: { ix: Index; goal: Goal }) {
  const p = stepProgress(kids(ix, goal.id))
  return (
    <article className={`card card-passive ${kc(goal.kind)} ${goal.status === 'done' ? 'is-done' : ''}`} {...cardKeys(goal)}>
      <Badge goal={goal} />
      <div className="card-head-text">
        <h4 className="mini-title">{displayTitle(goal)}</h4>
        <div className="card-meta">{summaryText(ix, goal)}</div>
        {p.total > 0 && goal.status !== 'done' && <Bar value={p.done / p.total} kind={goal.kind} thin label="Steps done" />}
      </div>
    </article>
  )
}

/* ---------- Inline "add a step" ---------- */

export function AddStepInline({ parent, placeholder = 'Add a step' }: { parent: Goal; placeholder?: string }) {
  const [value, setValue] = useState('')
  const submit = () => {
    const title = value.trim()
    if (!title) return
    createGoal({ kind: 'task', title, parent_id: parent.id })
    setValue('')
  }
  return (
    <form
      className="add-inline"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <span className="add-inline-icon" aria-hidden="true">
        <IconPlus size={18} />
      </span>
      <input
        className="field field-inline"
        value={value}
        placeholder={placeholder}
        enterKeyHint="done"
        aria-label={placeholder}
        onChange={(e) => setValue(e.target.value)}
      />
      {value.trim() && (
        <button type="submit" className="btn btn-small btn-primary">
          Add
        </button>
      )}
    </form>
  )
}
