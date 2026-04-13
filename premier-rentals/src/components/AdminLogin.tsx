import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { adminSignIn } from '../lib/supabase'
import toast from 'react-hot-toast'

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 60 * 1000 // 60 seconds

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [lockCountdown, setLockCountdown] = useState(0)

  // Countdown ticker while locked
  useEffect(() => {
    if (!lockedUntil) return
    const tick = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setLockedUntil(null)
        setFailedAttempts(0)
        setLockCountdown(0)
        clearInterval(tick)
      } else {
        setLockCountdown(remaining)
      }
    }, 500)
    return () => clearInterval(tick)
  }, [lockedUntil])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    if (lockedUntil && Date.now() < lockedUntil) {
      toast.error(`Too many attempts. Try again in ${lockCountdown}s.`)
      return
    }

    setLoading(true)
    const { data, error } = await adminSignIn(email, password)
    setLoading(false)

    if (error) {
      const next = failedAttempts + 1
      setFailedAttempts(next)
      if (next >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_DURATION_MS
        setLockedUntil(until)
        setLockCountdown(LOCKOUT_DURATION_MS / 1000)
        toast.error(`Too many failed attempts. Locked for ${LOCKOUT_DURATION_MS / 1000}s.`)
      } else {
        toast.error(`Invalid credentials. ${MAX_ATTEMPTS - next} attempt(s) remaining.`)
      }
    } else {
      setFailedAttempts(0)
      setLockedUntil(null)
      const role = data.user?.app_metadata?.role as string | undefined
      const displayRole = role === 'staff' ? 'Staff' : 'Owner'
      toast.success(`Welcome back, ${displayRole}!`)
      navigate('/admin/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <p
            className="text-white text-3xl tracking-[0.2em] uppercase mb-2"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300 }}
          >
            Premier
          </p>
          <p className="section-label text-[10px]" style={{ color: '#c9a96e' }}>Management Portal</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-white/10 bg-[#242424] p-5 sm:p-8">
          <div className="flex items-center justify-center mb-6">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.3)' }}
            >
              <Lock size={20} color="#c9a96e" strokeWidth={1.5} />
            </div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] tracking-widest uppercase text-white/40 block mb-1.5" style={{ fontFamily: 'Jost, sans-serif' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@premierrentals.com"
                className="form-input rounded w-full"
              />
            </div>
            <div>
              <label className="text-[10px] tracking-widest uppercase text-white/40 block mb-1.5" style={{ fontFamily: 'Jost, sans-serif' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="form-input rounded w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !!lockedUntil}
              className="btn-gold w-full justify-center mt-2 disabled:opacity-60 min-h-[44px]"
            >
              {loading
                ? 'Signing in...'
                : lockedUntil
                  ? `Locked (${lockCountdown}s)`
                  : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
