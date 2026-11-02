import { useEffect, useMemo, useState } from 'react'
import { countdown, habitStats, stepProgress, timeUsed } from '../calc'
import { fmtDate, localDate, parts, todayISO, toISO, weekdayLetters } from '../dates'
import { ancestors, dates, displayTitle, kids, type Index, useIndex } from '../data'
import { go, goalPath } from '../router'
import { deleteGoal, deleteImpact, setCheckinNote, setStatus, toggleCheckin, updateGoal } from '../store'
import type { Goal, Status } from '../types'
import { KIND_INFO } from '../types'
import { AddStepInline, DaysLeft, HabitRow, MiniCard, StepRow } from '../components/cards'
import { IconArchive, IconBack, IconCheck, IconChevron, IconMore, IconPencil, IconPlus, IconRestore, IconTrash, KindIcon } from '../components/icons'
import { ActionSheet, Badge, Bar, CheckButton, ConfirmSheet, NotesBox, ProblemNotice, SyncPill, TickBox, TopBar, kc, type Action } from '../components/ui'

export function GoalDetail({ id }: { id: string }) {
  const ix = useIndex()
  const goal = ix.goals[id]
  const [menu, setMenu] = useState(false)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  if (!goal) {
    return (
      <div className="page">
        <TopBar
          left={
            <button type="button" className="icon-btn" aria-label="Back" onClick={() => go('/')}>
              <IconBack />
            </button>
          }
        />
        <div className="empty">
          <h2 className="empty-title">Goal not found</h2>
          <p>It may have been deleted.</p>
        </div>
      </div>
    )
  }

  const parent = goal.parent_id ? ix.goals[goal.parent_id] : undefined
  const back = () => go(parent ? goalPath(parent.id) : '/')
  const trail = ancestors(ix, goal)
  const done = goal.status === 'done'
  const impact = confirm ? deleteImpact(goal.id) : { goals: 0, checkins: 0 }

  const actions: Action[] = [
    done
      ? { label: goal.kind === 'habit' ? 'Resume habit' : 'Mark as not done', icon: <IconRestore size={20} />, onClick: () => setStatus(goal.id, 'active') }
      : { label: goal.kind === 'habit' ? 'Finish habit' : 'Mark done', icon: <IconCheck size={20} />, onClick: () => setStatus(goal.id, 'done') },
    {
      label: 'Archive',
      icon: <IconArchive size={20} />,
      onClick: () => {
        updateGoal(goal.id, { archived: true })
        back()
      },
    },
    { label: 'Delete…', icon: <IconTrash size={20} />, danger: true, onClick: () => setConfirm(true) },
  ]

  return (
    <div className={`page page-detail ${kc(goal.kind)}`}>
      <TopBar
        left={
          <button type="button" className="icon-btn" aria-label="Back" onClick={back}>
            <IconBack />
          </button>
        }
        right={
          <>
            <SyncPill />
            <button type="button" className="icon-btn" aria-label="Edit goal" onClick={() => go(`/goal/${goal.id}/edit`)}>
              <IconPencil />
            </button>
            <button type="button" className="icon-btn" aria-label="More actions" onClick={() => setMenu(true)}>
              <IconMore />
            </button>
          </>
        }
      />

      <ProblemNotice />

      <div className="detail-head">
        {trail.length > 0 && (
          <nav className="trail" aria-label="Inside">
            {trail.map((a, i) => (
              <span key={a.id}>
                {i > 0 && <span className="trail-sep">›</span>}
                <button type="button" className="trail-link" onClick={() => go(goalPath(a.id))}>
                  {a.emoji ? `${a.emoji} ` : ''}
                  {displayTitle(a)}
                </button>
              </span>
            ))}
          </nav>
        )}
        <div className="detail-title-row">
          <Badge goal={goal} size="lg" />
          <div>
            <span className={`kind-tag ${kc(goal.kind)}`}>
              <KindIcon kind={goal.kind} size={13} />
              {KIND_INFO[goal.kind].label}
              {goal.archived && ' · Archived'}
            </span>
            <h1 className="detail-title">{displayTitle(goal)}</h1>
          </div>
        </div>
      </div>

      {goal.kind === 'deadline' && <DeadlineBody ix={ix} goal={goal} />}
      {goal.kind === 'habit' && <HabitBody ix={ix} goal={goal} />}
      {goal.kind === 'passive' && <PassiveBody ix={ix} goal={goal} />}
      {goal.kind === 'collection' && <CollectionBody ix={ix} goal={goal} />}
      {goal.kind === 'task' && <TaskBody ix={ix} goal={goal} />}

      <NotesBox goal={goal} />

      <ActionSheet open={menu} onClose={() => setMenu(false)} title={displayTitle(goal)} actions={actions} />
      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete permanently?"
        confirm="Delete permanently"
        onConfirm={() => {
          deleteGoal(goal.id)
          go(parent ? goalPath(parent.id) : '/', { replace: true })
        }}
        body={
          <p>
            <b>{displayTitle(goal)}</b>
            {impact.goals || impact.checkins ? (
              <>
                {' '}
                and {plural(impact.goals, 'sub-goal')} and {plural(impact.checkins, 'check-in')} will be deleted.
              </>
            ) : (
              ' will be deleted.'
            )}{' '}
            This can't be undone. Archive it instead if you might want it back.
          </p>
        }
      />
    </div>
  )
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

/* ---------- Sub-goals, grouped ---------- */

function Children({ ix, goal, stepsLabel = 'Steps', showEmptySteps = true }: { ix: Index; goal: Goal; stepsLabel?: string; showEmptySteps?: boolean }) {
  const children = kids(ix, goal.id)
  const habits = children.filter((c) => c.kind === 'habit')
  const steps = children.filter((c) => c.kind === 'task')
  const nested = children.filter((c) => c.kind !== 'habit' && c.kind !== 'task')
  const orderedSteps = [...steps.filter((s) => s.status !== 'done'), ...steps.filter((s) => s.status === 'done')]
  const p = stepProgress(children)
  const stepKind = goal.kind === 'passive' ? 'passive' : goal.kind === 'deadline' ? 'deadline' : 'task'

  return (
    <>
      {habits.length > 0 && (
        <section className="section">
          <h2 className="section-title">Habits</h2>
          <div className="list-card">
            {habits.map((h) => (
              <HabitRow key={h.id} ix={ix} goal={h} />
            ))}
          </div>
        </section>
      )}

      {(steps.length > 0 || showEmptySteps) && (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">{stepsLabel}</h2>
            {p.total > 0 && (
              <span className="section-aside">
                {p.done} of {p.total} done
              </span>
            )}
          </div>
          <div className="list-card">
            {orderedSteps.map((s) => (
              <StepRow key={s.id} ix={ix} goal={s} kind={stepKind} />
            ))}
            <AddStepInline parent={goal} />
          </div>
        </section>
      )}

      {nested.length > 0 && (
        <section className="section">
          <h2 className="section-title">Goals inside</h2>
          <div className="stack">
            {nested.map((n) => (
              <MiniCard key={n.id} ix={ix} goal={n} />
            ))}
          </div>
        </section>
      )}

      <button type="button" className="btn btn-soft btn-block add-sub" onClick={() => go(`/goal/${goal.id}/new`)}>
        <IconPlus size={18} /> Add sub-goal
      </button>
    </>
  )
}

/* ---------- Deadline ---------- */

function DeadlineBody({ ix, goal }: { ix: Index; goal: Goal }) {
  const cd = countdown(goal)
  const used = timeUsed(goal)
  return (
    <>
      <section className={`hero ${kc('deadline')} ${cd.state === 'overdue' ? 'is-overdue' : ''}`}>
        <DaysLeft goal={goal} hero />
        <p className="hero-meta">
          {cd.state === 'done' ? cd.label : goal.due_date ? fmtDate(goal.due_date, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) : 'No due date yet: tap the pencil to add one'}
          {cd.weeks && <span className="hero-weeks"> · {cd.weeks}</span>}
        </p>
        {used !== null && cd.state !== 'done' && (
          <div className="hero-bar">
            <Bar value={used} kind="deadline" label="Time used" />
            <div className="hero-bar-labels">
              <span>Started {fmtDate(goal.start_date, { month: 'short', day: 'numeric' })}</span>
              <span>{Math.round(used * 100)}% of time used</span>
            </div>
          </div>
        )}
      </section>
      <Children ix={ix} goal={goal} />
    </>
  )
}

/* ---------- Habit ---------- */

function HabitBody({ ix, goal }: { ix: Index; goal: Goal }) {
  const today = todayISO()
  const set = dates(ix, goal.id)
  const s = habitStats(goal, set)
  const [month, setMonth] = useState(() => today.slice(0, 7)) // YYYY-MM
  const [selected, setSelected] = useState(today)
  const finished = goal.status === 'done'
  const children = kids(ix, goal.id)

  return (
    <>
      <section className={`hero hero-habit ${kc('habit')} ${s.doneToday ? 'is-on' : ''}`}>
        <div className="habit-toggle">
          <CheckButton size="lg" checked={s.doneToday} onToggle={(v) => toggleCheckin(goal.id, today, v)} label="Done today" />
          <div>
            <div className="habit-toggle-title">{s.doneToday ? 'Done today' : 'Not done yet today'}</div>
            <div className="habit-toggle-sub">{s.doneToday ? 'Nice. See you tomorrow.' : 'Tap the circle when you have'}</div>
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <span className="stat-num">{s.streak}</span>
            <span className="stat-label">Streak</span>
          </div>
          <div className="stat">
            <span className="stat-num">{s.best}</span>
            <span className="stat-label">Best</span>
          </div>
          <div className="stat">
            <span className="stat-num">
              {Math.round(s.rate * 100)}
              <small>%</small>
            </span>
            <span className="stat-label">Since {fmtDate(goal.start_date, { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
        {finished && <p className="hero-meta">This habit is marked finished. It won't show in Today.</p>}
      </section>

      <Calendar goal={goal} set={set} month={month} setMonth={setMonth} selected={selected} setSelected={setSelected} />
      <DayNote ix={ix} goal={goal} date={selected} />

      {children.length > 0 ? (
        <Children ix={ix} goal={goal} showEmptySteps={false} />
      ) : (
        <button type="button" className="btn btn-soft btn-block add-sub" onClick={() => go(`/goal/${goal.id}/new`)}>
          <IconPlus size={18} /> Add sub-goal
        </button>
      )}
    </>
  )
}

function Calendar({
  goal,
  set,
  month,
  setMonth,
  selected,
  setSelected,
}: {
  goal: Goal
  set: Set<string>
  month: string
  setMonth: (m: string) => void
  selected: string
  setSelected: (d: string) => void
}) {
  const today = todayISO()
  const [y, m] = parts(`${month}-01`)
  const first = new Date(y, m - 1, 1)
  const daysInMonth = new Date(y, m, 0).getDate()
  const lead = (first.getDay() + 6) % 7 // Monday-first
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toISO(new Date(y, m - 1, i + 1))),
  ]
  const shift = (n: number) => setMonth(toISO(new Date(y, m - 1 + n, 1)).slice(0, 7))
  const count = cells.filter((c) => c && set.has(c)).length
  const letters = useMemo(() => weekdayLetters(), [])
  const isCurrent = month === today.slice(0, 7)

  return (
    <section className={`section calendar ${kc('habit')}`}>
      <div className="cal-head">
        <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => shift(-1)}>
          <IconBack size={18} />
        </button>
        <div className="cal-title">
          {first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          <span className="cal-count">{count} days</span>
        </div>
        <button type="button" className="icon-btn" aria-label="Next month" disabled={isCurrent} onClick={() => shift(1)}>
          <IconChevron size={18} />
        </button>
      </div>
      <div className="cal-grid" role="grid">
        {letters.map((l, i) => (
          <span key={`h${i}`} className="cal-wd" aria-hidden="true">
            {l}
          </span>
        ))}
        {cells.map((d, i) =>
          d ? (
            <button
              key={d}
              type="button"
              className={`cal-day ${set.has(d) ? 'is-on' : ''} ${d === today ? 'is-today' : ''} ${d === selected ? 'is-selected' : ''} ${d > today ? 'is-future' : ''}`}
              disabled={d > today}
              aria-pressed={set.has(d)}
              aria-label={`${fmtDate(d)}${set.has(d) ? ', done' : ''}`}
              onClick={() => {
                setSelected(d)
                toggleCheckin(goal.id, d, !set.has(d))
              }}
            >
              {Number(d.slice(8))}
            </button>
          ) : (
            <span key={`e${i}`} />
          ),
        )}
      </div>
      <p className="hint">Tap a day to tick or untick it.</p>
    </section>
  )
}

function DayNote({ ix, goal, date }: { ix: Index; goal: Goal; date: string }) {
  const checkin = (ix.checkinsByGoal.get(goal.id) ?? []).find((c) => c.date === date)
  const [value, setValue] = useState(checkin?.note ?? '')
  useEffect(() => {
    setValue(checkin?.note ?? '')
    // reset only when the day or check-in changes, not on every keystroke
  }, [date, checkin?.id])
  const label = date === todayISO() ? 'Today' : localDate(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
  return (
    <section className="section day-note">
      <label className="section-title" htmlFor="day-note">
        Note · {label}
      </label>
      {checkin ? (
        <input
          id="day-note"
          className="field"
          value={value}
          placeholder="How did it go? (optional)"
          onChange={(e) => {
            setValue(e.target.value)
            setCheckinNote(checkin.id, e.target.value)
          }}
        />
      ) : (
        <p className="muted day-note-empty">{date > todayISO() ? '' : 'Tick this day to add a note.'}</p>
      )}
    </section>
  )
}

/* ---------- Passive ---------- */

function PassiveBody({ ix, goal }: { ix: Index; goal: Goal }) {
  const p = stepProgress(kids(ix, goal.id))
  const done = goal.status === 'done'
  return (
    <>
      <section className={`hero hero-calm ${kc(goal.kind)}`}>
        {done ? (
          <p className="calm-line">{countdown(goal).label}</p>
        ) : (
          <>
            <p className="calm-line">No date. No pressure. One step at a time.</p>
            {p.total > 0 && (
              <div className="calm-progress">
                <Bar value={p.done / p.total} kind="passive" thin label="Steps done" />
                <span>
                  {p.done} of {p.total} steps
                </span>
              </div>
            )}
          </>
        )}
      </section>
      <Children ix={ix} goal={goal} />
      {!done && (
        <button type="button" className="btn btn-primary btn-block btn-kind achieve" onClick={() => setStatus(goal.id, 'done')}>
          <IconCheck size={18} /> Mark achieved
        </button>
      )}
    </>
  )
}

/* ---------- Collection ---------- */

const SECTIONS: { status: Status; label: string }[] = [
  { status: 'active', label: 'Doing' },
  { status: 'want', label: 'Want to' },
  { status: 'done', label: 'Done' },
]

function CollectionBody({ ix, goal }: { ix: Index; goal: Goal }) {
  const children = kids(ix, goal.id)
  const [moving, setMoving] = useState<Goal | null>(null)
  const moveActions: Action[] = moving
    ? [
        ...SECTIONS.filter((s) => s.status !== moving.status).map((s) => ({
          label: `Move to ${s.label}`,
          onClick: () => setStatus(moving.id, s.status),
        })),
        { label: 'Open', onClick: () => go(goalPath(moving.id)) },
      ]
    : []

  return (
    <>
      {SECTIONS.map((sec) => {
        const items = children.filter((c) => c.status === sec.status)
        return (
          <section key={sec.status} className={`section col-section col-${sec.status}`}>
            <div className="section-head">
              <h2 className="section-title">{sec.label}</h2>
              <span className="section-aside">{items.length}</span>
            </div>
            {items.length ? (
              <div className="stack">
                {items.map((c) => (
                  <MiniCard
                    key={c.id}
                    ix={ix}
                    goal={c}
                    right={
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Move ${c.title}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setMoving(c)
                        }}
                      >
                        <IconMore />
                      </button>
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="empty-line">{sec.status === 'active' ? 'Nothing in progress' : sec.status === 'want' ? 'Nothing waiting' : 'Nothing finished yet'}</p>
            )}
          </section>
        )
      })}
      <button type="button" className="btn btn-primary btn-block btn-kind add-sub" onClick={() => go(`/goal/${goal.id}/new`)}>
        <IconPlus size={18} /> Add an item
      </button>
      <ActionSheet open={!!moving} onClose={() => setMoving(null)} title={moving ? displayTitle(moving) : ''} actions={moveActions} />
    </>
  )
}

/* ---------- Task ---------- */

function TaskBody({ ix, goal }: { ix: Index; goal: Goal }) {
  const done = goal.status === 'done'
  return (
    <>
      <section className={`hero hero-task ${kc('task')}`}>
        <div className="habit-toggle">
          <TickBox checked={done} onToggle={(v) => setStatus(goal.id, v ? 'done' : 'active')} label="Done" />
          <div>
            <div className="habit-toggle-title">{done ? 'Done' : 'Not done yet'}</div>
            {done && goal.completed_at && <div className="habit-toggle-sub">{countdown(goal).label}</div>}
          </div>
        </div>
      </section>
      <Children ix={ix} goal={goal} />
    </>
  )
}

