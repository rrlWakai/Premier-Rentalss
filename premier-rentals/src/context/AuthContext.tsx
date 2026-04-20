import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import toast from 'react-hot-toast'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const IDLE_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const

interface AuthContextType {
  session: Session | null
  loading: boolean
  isAdmin: boolean // true for both owner and staff
  role: 'admin' | 'staff' | null
  isOwner: boolean
  isStaff: boolean
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  isAdmin: false,
  role: null,
  isOwner: false,
  isStaff: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      // Create a profile row on first login; ignoreDuplicates prevents overwriting an existing admin role
      if (event === 'SIGNED_IN' && session?.user) {
        supabase
          .from('profiles')
          .upsert({ id: session.user.id, role: 'user' }, { onConflict: 'id', ignoreDuplicates: true })
          .then(({ error }) => { if (error) console.error('Profile upsert error:', error) })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Idle timeout — auto sign-out after 30 minutes of inactivity
  useEffect(() => {
    if (!session) return

    const resetTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(async () => {
        await supabase.auth.signOut()
        toast.error('Session expired due to inactivity. Please sign in again.')
      }, IDLE_TIMEOUT_MS)
    }

    IDLE_EVENTS.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      IDLE_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer))
    }
  }, [session])

  const role = session?.user?.app_metadata?.role as 'admin' | 'staff' | null
  const isOwner = role === 'admin'
  const isStaff = role === 'staff'
  const isAdmin = isOwner || isStaff // Anyone with an admin or staff role is allowed in the portal

  return (
    <AuthContext.Provider value={{ session, loading, isAdmin, role, isOwner, isStaff }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
