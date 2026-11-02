import { useEffect, useState } from 'react'
import { parseHash, useHash } from './router'
import { endSession, startSession, useStore } from './store'
import { supabase } from './supabase'
import { Home } from './screens/Home'
import { AddGoal } from './screens/AddGoal'
import { GoalDetail } from './screens/GoalDetail'
import { EditGoal } from './screens/EditGoal'
import { Archived, SchemaMissing, Settings } from './screens/Other'
import { SignIn } from './screens/SignIn'

type Auth = { status: 'loading' } | { status: 'out' } | { status: 'in'; userId: string; email: string | null }

export default function App() {
  const [auth, setAuth] = useState<Auth>({ status: 'loading' })
  const schemaMissing = useStore((s) => s.schemaMissing)
  const hash = useHash()
  const route = parseHash(hash)

  useEffect(() => {
    const apply = (session: { user: { id: string; email?: string } } | null) => {
      if (session) {
        startSession(session.user.id, session.user.email ?? null)
        setAuth({ status: 'in', userId: session.user.id, email: session.user.email ?? null })
      } else {
        endSession()
        setAuth({ status: 'out' })
      }
    }
    void supabase.auth.getSession().then(({ data }) => apply(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') apply(session)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (auth.status === 'loading') return <div className="boot" />
  if (auth.status === 'out') return <SignIn />
  if (schemaMissing) return <SchemaMissing />

  switch (route.name) {
    case 'new':
      return <AddGoal key={route.parentId ?? 'top'} parentId={route.parentId} />
    case 'goal':
      return <GoalDetail key={route.id} id={route.id} />
    case 'edit':
      return <EditGoal id={route.id} />
    case 'archived':
      return <Archived />
    case 'settings':
      return <Settings />
    default:
      return <Home />
  }
}
