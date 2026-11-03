import { useState } from 'react'
import { ancestors, displayTitle, useIndex } from '../data'
import { go } from '../router'
import { clearUserCache, deleteGoal, deleteImpact, endSession, flush, refresh, updateGoal, useStore } from '../store'
import { DASHBOARD_URL, SQL_EDITOR_URL, SUPABASE_URL, supabase } from '../supabase'
import type { Goal } from '../types'
import { IconBack, IconOut, IconRestore, IconTrash } from '../components/icons'
import { Badge, ConfirmSheet, TopBar } from '../components/ui'
import { getAppearance, setAppearance, type Appearance } from '../appearance'

/* ---------- Archived ---------- */

export function Archived() {
  const ix = useIndex()
  const [deleting, setDeleting] = useState<Goal | null>(null)
  const items = Object.values(ix.goals)
    .filter((g) => g.archived)
    .sort((a, b) => a.title.localeCompare(b.title))
  const impact = deleting ? deleteImpact(deleting.id) : { goals: 0, checkins: 0 }

  return (
    <div className="page">
      <TopBar
        left={
          <button type="button" className="icon-btn" aria-label="Back" onClick={() => go('/')}>
            <IconBack />
          </button>
        }
        center={<span className="topbar-title">Archived</span>}
      />
      {items.length === 0 ? (
        <div className="empty">
          <h2 className="empty-title">Nothing archived</h2>
          <p>Archived goals are hidden everywhere else and can be restored here.</p>
        </div>
      ) : (
        <div className="list-card">
          {items.map((g) => {
            const trail = ancestors(ix, g)
            return (
              <div key={g.id} className="row row-archived">
                <Badge goal={g} size="sm" />
                <div className="row-main is-static">
                  <span className="row-title">{displayTitle(g)}</span>
                  {trail.length > 0 && <span className="row-sub">in {trail.map(displayTitle).join(' › ')}</span>}
                </div>
                <button type="button" className="icon-btn" aria-label={`Restore ${g.title}`} onClick={() => updateGoal(g.id, { archived: false })}>
                  <IconRestore />
                </button>
                <button type="button" className="icon-btn is-danger" aria-label={`Delete ${g.title} permanently`} onClick={() => setDeleting(g)}>
                  <IconTrash />
                </button>
              </div>
            )
          })}
        </div>
      )}
      <ConfirmSheet
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete permanently?"
        confirm="Delete permanently"
        onConfirm={() => deleting && deleteGoal(deleting.id)}
        body={
          <p>
            <b>{deleting ? displayTitle(deleting) : ''}</b>
            {impact.goals || impact.checkins
              ? ` and ${impact.goals} sub-goal${impact.goals === 1 ? '' : 's'} and ${impact.checkins} check-in${impact.checkins === 1 ? '' : 's'} will be deleted.`
              : ' will be deleted.'}{' '}
            This can't be undone.
          </p>
        }
      />
    </div>
  )
}

/* ---------- Settings ---------- */

export function Settings() {
  const email = useStore((s) => s.email)
  const userId = useStore((s) => s.userId)
  const pending = useStore((s) => s.pending)
  const lastLoaded = useStore((s) => s.lastLoaded)
  const [confirm, setConfirm] = useState(false)
  const [appearance, setLocalAppearance] = useState<Appearance>(getAppearance)

  const signOut = async () => {
    flush()
    if (userId) clearUserCache(userId)
    endSession()
    await supabase.auth.signOut()
    go('/', { replace: true })
  }

  return (
    <div className="page">
      <TopBar
        left={
          <button type="button" className="icon-btn" aria-label="Back" onClick={() => go('/')}>
            <IconBack />
          </button>
        }
        center={<span className="topbar-title">Settings</span>}
      />
      <section className="section">
        <h2 className="section-title">Account</h2>
        <div className="list-card">
          <div className="row is-static">
            <div className="row-main is-static">
              <span className="row-sub">Signed in as</span>
              <span className="row-title">{email ?? '—'}</span>
            </div>
          </div>
          <div className="row is-static">
            <div className="row-main is-static">
              <span className="row-sub">Sync</span>
              <span className="row-title">{pending ? `${pending} change${pending === 1 ? '' : 's'} waiting to save` : 'All changes saved'}</span>
              {lastLoaded && <span className="row-sub">Last refreshed {new Date(lastLoaded).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>}
            </div>
            <button type="button" className="btn btn-small" onClick={() => void refresh()}>
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Appearance</h2>
        <div className="segmented" role="radiogroup" aria-label="Appearance">
          {(
            [
              ['light', 'Light'],
              ['dark', 'Dark'],
              ['system', 'Match iPhone'],
            ] as [Appearance, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={appearance === value}
              className={appearance === value ? 'is-on' : ''}
              onClick={() => {
                setAppearance(value)
                setLocalAppearance(value)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Supabase project</h2>
        <div className="list-card">
          <div className="row is-static">
            <div className="row-main is-static">
              <span className="row-sub">Project URL</span>
              <span className="row-title mono">{SUPABASE_URL}</span>
            </div>
          </div>
          <a className="row row-link" href={DASHBOARD_URL} target="_blank" rel="noreferrer">
            <span className="row-main is-static">
              <span className="row-title">Open dashboard</span>
            </span>
            <IconOut size={18} />
          </a>
        </div>
      </section>

      <button type="button" className="btn btn-danger-soft btn-block" onClick={() => (pending ? setConfirm(true) : void signOut())}>
        Sign out
      </button>

      <p className="footnote">Beautiful Reminders · build {__BUILD_ID__}</p>

      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Sign out now?"
        confirm="Sign out anyway"
        onConfirm={() => void signOut()}
        body={<p>{pending} change{pending === 1 ? " hasn't" : "s haven't"} reached Supabase yet and will be lost if you sign out now.</p>}
      />
    </div>
  )
}

/* ---------- Schema not set up yet ---------- */

export function SchemaMissing() {
  return (
    <div className="page">
      <div className="setup">
        <h1 className="home-title">One-time setup</h1>
        <p>
          The app's tables (<code>br_goals</code> and <code>br_checkins</code>) aren't in Supabase yet. Paste the schema SQL into the SQL Editor and run it,
          then come back and tap Try again.
        </p>
        <div className="setup-actions">
          <a className="btn btn-primary" href={SQL_EDITOR_URL} target="_blank" rel="noreferrer">
            Open SQL Editor <IconOut size={14} />
          </a>
          <button type="button" className="btn btn-ghost" onClick={() => void refresh()}>
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
