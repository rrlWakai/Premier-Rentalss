import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function AdminSignup() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const key = searchParams.get('key')
  const secretKey = import.meta.env.VITE_ADMIN_SIGNUP_KEY

  if (!key || key !== secretKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] px-4">
        <div className="text-center">
          <p className="text-white/40 text-sm tracking-widest uppercase" style={{ fontFamily: 'Jost, sans-serif' }}>
            Unauthorized
          </p>
        </div>
      </div>
    )
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData?.user) {
      setError('Account created but could not retrieve user. Please contact admin.')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        { id: userData.user.id, role: 'user' },
        { onConflict: 'id', ignoreDuplicates: true }
      )

    if (profileError) {
      setError('Account created but profile setup failed. Please contact admin.')
      setLoading(false)
      return
    }

    await supabase.auth.signOut()

    toast.success('Account created. You can now sign in.')
    navigate('/admin')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p
            className="text-white text-3xl tracking-[0.2em] uppercase mb-2"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300 }}
          >
            Premier
          </p>
          <p className="section-label text-[10px]" style={{ color: '#c9a96e' }}>
            Create Account
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#242424] p-5 sm:p-8">
          <div className="flex items-center justify-center mb-6">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.3)' }}
            >
              <UserPlus size={20} color="#c9a96e" strokeWidth={1.5} />
            </div>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 rounded border border-red-500/30 bg-red-500/10">
              <p className="text-red-400 text-xs" style={{ fontFamily: 'Jost, sans-serif' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] tracking-widest uppercase text-white/40 block mb-1.5" style={{ fontFamily: 'Jost, sans-serif' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
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

            <div>
              <label className="text-[10px] tracking-widest uppercase text-white/40 block mb-1.5" style={{ fontFamily: 'Jost, sans-serif' }}>
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="form-input rounded w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full justify-center mt-2 disabled:opacity-60 min-h-[44px]"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
