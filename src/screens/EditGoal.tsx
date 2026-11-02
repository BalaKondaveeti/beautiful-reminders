import { useMemo, useState } from 'react'
import { ancestors, displayTitle, useIndex } from '../data'
import { go, goalPath } from '../router'
import { descendantIds, updateGoal } from '../store'
import { KINDS, KIND_INFO, type Goal, type Kind, type Status } from '../types'
import { IconBack, KindIcon } from '../components/icons'
import { TopBar, kc } from '../components/ui'
import { EMOJI_PICKS } from './AddGoal'

export function EditGoal({ id }: { id: string }) {
  const ix = useIndex()
  const goal = ix.goals[id]
  if (!goal) {
    return (
      <div className="page">
        <TopBar left={<button type="button" className="icon-btn" aria-label="Back" onClick={() => go('/')}><IconBack /></button>} />
        <div className="empty"><h2 className="empty-title">Goal not found</h2></div>
      </div>
    )
  }
  return <EditForm key={goal.id} goal={goal} />
}

function EditForm({ goal }: { goal: Goal }) {
  const ix = useIndex()
  const [title, setTitle] = useState(goal.title)
  const [emoji, setEmoji] = useState(goal.emoji ?? '')
  const [kind, setKind] = useState<Kind>(goal.kind)
  const [due, setDue] = useState(goal.due_date ?? '')
  const [start, setStart] = useState(goal.start_date)
  const [parentId, setParentId] = useState(goal.parent_id ?? '')
  const [status, setStatus] = useState<Status>(goal.status)

  // Possible parents: any non-archived goal except this one and its descendants.
  const parents = useMemo(() => {
    const banned = descendantIds(goal.id)
    banned.add(goal.id)
    return Object.values(ix.goals)
      .filter((g) => !banned.has(g.id) && !g.archived)
      .map((g) => ({ g, path: [...ancestors(ix, g), g].map(displayTitle).join(' › ') }))
      .sort((a, b) => a.path.localeCompare(b.path))
  }, [ix, goal.id])

  const needsDue = kind === 'deadline' && !due
  const canSave = title.trim().length > 0 && !needsDue && (!due || !start || due >= start)
  const back = () => go(goalPath(goal.id), { replace: true })

  const save = () => {
    if (!canSave) return
    const patch: Partial<Goal> = {}
    if (title.trim() !== goal.title) patch.title = title.trim()
    if ((emoji.trim() || null) !== goal.emoji) patch.emoji = emoji.trim() || null
    if (kind !== goal.kind) patch.kind = kind
    if ((due || null) !== goal.due_date) patch.due_date = due || null
    if (start && start !== goal.start_date) patch.start_date = start
    if ((parentId || null) !== goal.parent_id) patch.parent_id = parentId || null
    if (status !== goal.status) {
      patch.status = status
      patch.completed_at = status === 'done' ? new Date().toISOString() : null
    }
    if (Object.keys(patch).length) updateGoal(goal.id, patch)
    back()
  }

  return (
    <div className={`page page-form ${kc(kind)}`}>
      <TopBar
        left={
          <button type="button" className="icon-btn" aria-label="Cancel" onClick={back}>
            <IconBack />
          </button>
        }
        center={<span className="topbar-title">Edit</span>}
        right={
          <button type="button" className="btn btn-small btn-primary" disabled={!canSave} onClick={save}>
            Save
          </button>
        }
      />

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <label className="field-label" htmlFor="e-title">
          Title
        </label>
        <input id="e-title" className="field" value={title} enterKeyHint="done" onChange={(e) => setTitle(e.target.value)} />

        <label className="field-label" htmlFor="e-emoji">
          Emoji
        </label>
        <div className="emoji-row">
          <input id="e-emoji" className="field field-emoji" value={emoji} placeholder="🙂" maxLength={8} onChange={(e) => setEmoji(e.target.value)} />
          <div className="emoji-picks">
            {EMOJI_PICKS.map((e) => (
              <button key={e} type="button" className={`emoji-pick ${emoji === e ? 'is-selected' : ''}`} onClick={() => setEmoji(emoji === e ? '' : e)}>
                {e}
              </button>
            ))}
          </div>
        </div>

        <span className="field-label">Kind</span>
        <div className="kind-pills" role="radiogroup" aria-label="Kind">
          {KINDS.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} className={`kind-pill ${kc(k)} ${kind === k ? 'is-on' : ''}`} onClick={() => setKind(k)}>
              <KindIcon kind={k} size={16} />
              {KIND_INFO[k].label}
            </button>
          ))}
        </div>
        {kind !== goal.kind && <p className="hint">Changing the kind keeps everything: sub-goals, check-ins, notes and dates.</p>}

        {(kind === 'deadline' || due) && (
          <>
            <label className="field-label" htmlFor="e-due">
              Due date {kind !== 'deadline' && <span className="muted">(optional)</span>}
            </label>
            <div className="field-with-action">
              <input id="e-due" type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} />
              {kind !== 'deadline' && due && (
                <button type="button" className="btn btn-small btn-ghost" onClick={() => setDue('')}>
                  Clear
                </button>
              )}
            </div>
            {needsDue && <p className="hint is-warn">A deadline needs a due date.</p>}
          </>
        )}

        <label className="field-label" htmlFor="e-start">
          Start date
        </label>
        <input id="e-start" type="date" className="field" value={start} onChange={(e) => setStart(e.target.value)} />
        {due && start && due < start && <p className="hint is-warn">The due date is before the start date.</p>}

        <span className="field-label">Status</span>
        <div className="segmented" role="radiogroup" aria-label="Status">
          {(['want', 'active', 'done'] as Status[]).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={status === s} className={status === s ? 'is-on' : ''} onClick={() => setStatus(s)}>
              {s === 'want' ? 'Not started' : s === 'active' ? 'Active' : 'Done'}
            </button>
          ))}
        </div>

        <label className="field-label" htmlFor="e-parent">
          Inside
        </label>
        <select id="e-parent" className="field" value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">Nothing (top level)</option>
          {parents.map(({ g, path }) => (
            <option key={g.id} value={g.id}>
              {g.emoji ? `${g.emoji} ` : ''}
              {path}
            </option>
          ))}
        </select>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-block btn-kind" disabled={!canSave}>
            Save changes
          </button>
        </div>
      </form>
    </div>
  )
}
