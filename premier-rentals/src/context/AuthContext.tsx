import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

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
