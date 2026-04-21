// src/components/AdminSignup.tsx

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

  // 🔒 Protect route
  if (!key || key !== secretKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] px-4">
        <p className="text-white/40 text-sm tracking-widest uppercase">
          Unauthorized
        </p>
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

    try {
      // ✅ Step 1: Create auth user
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) {
        throw signUpError
      }

      // 🔥 IMPORTANT: wait for session to be ready
      await new Promise((res) => setTimeout(res, 500))

      // ✅ Step 2: Get user safely
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user?.id) {
        throw new Error('User session not ready after signup.')
      }

      console.log('Creating profile for user:', user.id)

      // ✅ Step 3: Create profile safely
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            role: 'user',
          },
          {
            onConflict: 'id',
          }
        )

      if (profileError) {
        console.error('Profile upsert error:', profileError)
        throw new Error('Profile creation failed.')
      }

      // ✅ Step 4: logout (clean flow)
      await supabase.auth.signOut()

      toast.success('Account created successfully.')
      navigate('/admin')
    } catch (err: any) {
      console.error('Signup error:', err)
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-white text-3xl tracking-[0.2em] uppercase mb-2">
            Premier
          </p>
          <p className="text-[10px] text-[#c9a96e] uppercase tracking-widest">
            Create Account
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#242424] p-6">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center border border-[#c9a96e]/30 bg-[#c9a96e]/10">
              <UserPlus size={20} color="#c9a96e" />
            </div>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 rounded border border-red-500/30 bg-red-500/10">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input rounded"
            />

            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input rounded pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm Password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="form-input rounded pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full mt-2 disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}