import { useMemo } from 'react'
import { countdown } from '../calc'
import { todayISO, localDate } from '../dates'
import { dates, hiddenByArchive, kids, useIndex } from '../data'
import { go } from '../router'
import { refresh, useStore } from '../store'
import type { Goal } from '../types'
import { CollectionCard, DeadlineCard, HabitCard, HabitRow, PassiveCard, StepRow } from '../components/cards'
import { IconArchive, IconPlus, IconRefresh, IconSettings } from '../components/icons'
import { ProblemNotice, Ring, SyncPill } from '../components/ui'

export function Home() {
  const ix = useIndex()
  const loading = useStore((s) => s.loading)
  const hasData = useStore((s) => s.hasData)
  const today = todayISO()

  const view = useMemo(() => {
    const all = Object.values(ix.goals)
    const top = kids(ix, null)
    const todayHabits = all
      .filter((g) => g.kind === 'habit' && g.status !== 'done' && !hiddenByArchive(ix, g))
      .filter((g) => !g.parent_id || ix.goals[g.parent_id]?.status !== 'done')
      .sort((a, b) => (a.parent_id ? 1 : 0) - (b.parent_id ? 1 : 0) || a.position - b.position)
    const done = todayHabits.filter((g) => dates(ix, g.id).has(today)).length
    const deadlines = top
      .filter((g) => g.kind === 'deadline')
      .sort((a, b) => sortKey(a) - sortKey(b))
    return {
      todayHabits,
      done,
      deadlines,
      habits: top.filter((g) => g.kind === 'habit'),
      collections: top.filter((g) => g.kind === 'collection'),
      passive: top.filter((g) => g.kind === 'passive').sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done')),
      tasks: top.filter((g) => g.kind === 'task'),
      archived: all.filter((g) => g.archived).length,
      empty: top.length === 0,
    }
  }, [ix, today])

  const dateLine = localDate(today).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="page page-home">
      <header className="home-head">
        <div className="home-head-row">
          <p className="eyebrow">{dateLine}</p>
          <div className="home-tools">
            <SyncPill />
            <button type="button" className={`icon-btn ${loading ? 'is-spinning' : ''}`} aria-label="Refresh" onClick={() => void refresh()}>
              <IconRefresh />
            </button>
            <button type="button" className="icon-btn" aria-label="Settings" onClick={() => go('/settings')}>
              <IconSettings />
            </button>
          </div>
        </div>
        <h1 className="home-title">Beautiful Reminders</h1>
      </header>

      <ProblemNotice />

      {!hasData && loading && <div className="loading-note">Loading your goals…</div>}

      {view.todayHabits.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Today's habits</h2>
            <div className="today-summary">
              <Ring value={view.done / view.todayHabits.length} kind="habit" size={22} stroke={3} />
              <span>
                {view.done} of {view.todayHabits.length} done
              </span>
            </div>
          </div>
          <div className="list-card">
            {view.todayHabits.map((g) => (
              <HabitRow key={g.id} ix={ix} goal={g} showParent />
            ))}
          </div>
        </section>
      )}

      {view.deadlines.length > 0 && (
        <section className="section">
          <h2 className="section-title">Deadlines</h2>
          <div className="stack">
            {view.deadlines.map((g) => (
              <DeadlineCard key={g.id} ix={ix} goal={g} />
            ))}
          </div>
        </section>
      )}

      {view.habits.length > 0 && (
        <section className="section">
          <h2 className="section-title">Habits</h2>
          <div className="stack">
            {view.habits.map((g) => (
              <HabitCard key={g.id} ix={ix} goal={g} />
            ))}
          </div>
        </section>
      )}

      {view.collections.length > 0 && (
        <section className="section">
          <h2 className="section-title">Collections</h2>
          <div className="stack">
            {view.collections.map((g) => (
              <CollectionCard key={g.id} ix={ix} goal={g} />
            ))}
          </div>
        </section>
      )}

      {view.passive.length > 0 && (
        <section className="section">
          <h2 className="section-title">Long-term goals</h2>
          <div className="grid-2">
            {view.passive.map((g) => (
              <PassiveCard key={g.id} ix={ix} goal={g} />
            ))}
          </div>
        </section>
      )}

      {view.tasks.length > 0 && (
        <section className="section">
          <h2 className="section-title">Tasks</h2>
          <div className="list-card">
            {view.tasks.map((g) => (
              <StepRow key={g.id} ix={ix} goal={g} />
            ))}
          </div>
        </section>
      )}

      {hasData && view.empty && (
        <div className="empty">
          <h2 className="empty-title">Nothing here yet</h2>
          <p>Add a goal with a deadline, a daily habit, or something long-term.</p>
          <button type="button" className="btn btn-primary" onClick={() => go('/new')}>
            Add a goal
          </button>
        </div>
      )}

      {view.archived > 0 && (
        <button type="button" className="link-btn archived-link" onClick={() => go('/archived')}>
          <IconArchive size={16} /> Archived ({view.archived})
        </button>
      )}

      <button type="button" className="fab" aria-label="Add a goal" onClick={() => go('/new')}>
        <IconPlus size={28} />
      </button>
    </div>
  )
}

// Sort deadlines by days left; undated after dated; achieved last.
function sortKey(g: Goal): number {
  if (g.status === 'done') return 1e9
  const cd = countdown(g)
  if (cd.state === 'none') return 1e8
  if (cd.state === 'overdue') return -cd.days
  return cd.days
}

