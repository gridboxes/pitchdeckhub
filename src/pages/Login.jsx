import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { mockAuth } from '../lib/mockAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await mockAuth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
      <div style={{ width: 360 }}>

        <div style={{ width: 40, height: 3, background: '#F6C347', marginBottom: 28 }} />

        <h1 className="font-display text-2xl font-bold tracking-tight mb-1" style={{ color: '#000000' }}>Mtel Pitch</h1>
        <p className="text-sm mb-2" style={{ color: '#888888' }}>Sign in to your workspace</p>
        <p className="text-xs mb-10" style={{ color: '#aaaaaa' }}>Demo — enter any email and password to continue.</p>

        <form onSubmit={handleSubmit} className="space-y-7">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: '#999999', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="team@mtel.com"
              className="w-full py-2 text-sm outline-none transition-all"
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #000', color: '#000', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderBottomColor = '#F6C347'}
              onBlur={e => e.target.style.borderBottomColor = '#000'}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: '#999999', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full py-2 pr-7 text-sm outline-none transition-all"
                style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #000', color: '#000', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderBottomColor = '#F6C347'}
                onBlur={e => e.target.style.borderBottomColor = '#000'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                className="absolute right-0 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: '#cccccc' }}
                onMouseEnter={e => e.currentTarget.style.color = '#000'}
                onMouseLeave={e => e.currentTarget.style.color = '#cccccc'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs" style={{ color: '#dc2626', borderLeft: '3px solid #dc2626', paddingLeft: 10 }}>
              {error}
            </p>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ background: '#000000', color: '#ffffff' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
