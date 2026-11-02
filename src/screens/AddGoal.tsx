import { useState } from 'react'
import { displayTitle, useIndex } from '../data'
import { addDays, todayISO } from '../dates'
import { go, goalPath } from '../router'
import { createGoal } from '../store'
import { KINDS, KIND_INFO, type Kind, type Status } from '../types'
import { IconBack, KindIcon } from '../components/icons'
import { AutoTextarea, TopBar, kc } from '../components/ui'

export const EMOJI_PICKS = ['🎯', '💪', '✨', '📚', '🏃', '🧘', '💼', '✈️', '🎹', '🌱', '💧', '🍎', '🧠', '💤', '🗣️', '🏍️']

export function AddGoal({ parentId }: { parentId: string | null }) {
  const ix = useIndex()
  const parent = parentId ? ix.goals[parentId] : undefined
  const inCollection = parent?.kind === 'collection'

  const [kind, setKind] = useState<Kind | null>(null)
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('')
  const [due, setDue] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<Status>(inCollection ? 'want' : 'active')

  const back = () => go(parent ? goalPath(parent.id) : '/')
  const canSave = !!kind && title.trim().length > 0 && (kind !== 'deadline' || !!due)

  const save = () => {
    if (!canSave || !kind) return
    const g = createGoal({
      kind,
      title: title.trim(),
      emoji: emoji.trim() || null,
      due_date: kind === 'deadline' ? due : null,
      notes: notes.trim() ? notes : null,
      parent_id: parent?.id ?? null,
      status,
    })
    go(goalPath(g.id), { replace: true })
  }

  if (parentId && !parent) {
    return (
      <div className="page">
        <TopBar left={<button type="button" className="icon-btn" aria-label="Back" onClick={() => go('/')}><IconBack /></button>} />
        <p className="muted">That goal no longer exists.</p>
      </div>
    )
  }

  return (
    <div className="page page-form">
      <TopBar
        left={
          <button type="button" className="icon-btn" aria-label="Back" onClick={back}>
            <IconBack />
          </button>
        }
        center={<span className="topbar-title">{parent ? 'Add sub-goal' : 'New goal'}</span>}
      />

      {parent && (
        <p className="form-context">
          Inside <b>{parent.emoji ? `${parent.emoji} ` : ''}{displayTitle(parent)}</b>
        </p>
      )}

      <section className="section">
        <h2 className="section-title">What kind?</h2>
        <div className="tiles">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className={`tile ${kc(k)} ${kind === k ? 'is-selected' : ''}`}
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
            >
              <span className="tile-icon">
                <KindIcon kind={k} size={24} />
              </span>
              <span className="tile-text">
                <span className="tile-label">{KIND_INFO[k].label}</span>
                <span className="tile-blurb">{KIND_INFO[k].blurb}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {kind && (
        <form
          className={`form ${kc(kind)}`}
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <label className="field-label" htmlFor="f-title">
            Title
          </label>
          <input
            id="f-title"
            className="field"
            value={title}
            placeholder={placeholderFor(kind)}
            enterKeyHint="done"
            onChange={(e) => setTitle(e.target.value)}
          />

          <label className="field-label" htmlFor="f-emoji">
            Emoji <span className="muted">(optional)</span>
          </label>
          <div className="emoji-row">
            <input
              id="f-emoji"
              className="field field-emoji"
              value={emoji}
              placeholder="🙂"
              maxLength={8}
              onChange={(e) => setEmoji(e.target.value)}
            />
            <div className="emoji-picks">
              {EMOJI_PICKS.map((e) => (
                <button key={e} type="button" className={`emoji-pick ${emoji === e ? 'is-selected' : ''}`} onClick={() => setEmoji(emoji === e ? '' : e)}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {kind === 'deadline' && (
            <>
              <label className="field-label" htmlFor="f-due">
                Due date
              </label>
              <input id="f-due" type="date" className="field" value={due} min={addDays(todayISO(), -3650)} onChange={(e) => setDue(e.target.value)} />
            </>
          )}

          {inCollection && (
            <>
              <span className="field-label">Section</span>
              <div className="segmented" role="radiogroup">
                {(['active', 'want', 'done'] as Status[]).map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={status === s} className={status === s ? 'is-on' : ''} onClick={() => setStatus(s)}>
                    {s === 'active' ? 'Doing' : s === 'want' ? 'Want to' : 'Done'}
                  </button>
                ))}
              </div>
            </>
          )}

          <label className="field-label" htmlFor="f-notes">
            Notes <span className="muted">(optional)</span>
          </label>
          <AutoTextarea id="f-notes" className="field notes" value={notes} placeholder="Why it matters, how you'll get there…" onChange={(e) => setNotes(e.target.value)} />

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-block btn-kind" disabled={!canSave}>
              Save {KIND_INFO[kind].label.toLowerCase()}
            </button>
            {kind === 'deadline' && !due && <p className="hint">Pick a due date to save.</p>}
          </div>
        </form>
      )}
    </div>
  )
}

function placeholderFor(k: Kind): string {
  switch (k) {
    case 'deadline':
      return 'e.g. Run a half marathon'
    case 'habit':
      return 'e.g. Read 20 minutes'
    case 'passive':
      return 'e.g. Learn to sail'
    case 'collection':
      return 'e.g. Books to read this year'
    case 'task':
      return 'e.g. Book the first lesson'
  }
}
