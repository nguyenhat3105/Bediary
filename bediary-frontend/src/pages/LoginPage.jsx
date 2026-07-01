import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../api/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login(form)
      const { token, userId, email, fullName, familyId, isPremium } = res.data
      localStorage.setItem('bediary_token', token)
      localStorage.setItem('bediary_user', JSON.stringify({ userId, email, fullName, familyId, isPremium }))
      navigate(familyId ? '/' : '/family-setup')
    } catch (err) {
      setError(err.response?.data?.message || 'Email hoặc mật khẩu không đúng.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(160deg, #fff5f8 0%, #ffffff 50%, #fff0f5 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px'
    }}>
      {/* Decorative circles */}
      <div style={{ position: 'fixed', top: '10%', right: '5%', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,92,138,0.07)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '15%', left: '5%', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,92,138,0.05)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div className="text-center" style={{ marginBottom: 32 }}>
          <div className="anim-float" style={{ fontSize: 56, lineHeight: 1, marginBottom: 12 }}>🍼</div>
          <h1 className="font-bold" style={{ fontSize: 30, color: 'var(--c-primary)', fontFamily: 'Poppins, sans-serif' }}>Bediary</h1>
          <p style={{ color: 'var(--c-text-hint)', fontSize: 14, marginTop: 4 }}>Nhật ký yêu thương của bé 💕</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32, borderRadius: 24 }}>
          <h2 className="font-bold" style={{ fontSize: 22, color: 'var(--c-text-1)', marginBottom: 4 }}>Chào mừng trở lại 👋</h2>
          <p style={{ color: 'var(--c-text-hint)', fontSize: 14, marginBottom: 28 }}>Đăng nhập để xem nhật ký của bé</p>

          {error && (
            <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: '#fff0f0', border: '1px solid #ffcccc', color: '#e53935', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label className="font-medium" style={{ display: 'block', fontSize: 13, color: 'var(--c-text-2)', marginBottom: 6 }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-hint)' }} />
                <input
                  id="login-email"
                  type="email"
                  placeholder="bo@bediary.app"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                  style={{
                    width: '100%', padding: '12px 14px 12px 40px', borderRadius: 12, border: '1.5px solid var(--c-border)',
                    fontSize: 15, fontFamily: 'Poppins, sans-serif', outline: 'none', boxSizing: 'border-box',
                    background: '#fafafa', color: 'var(--c-text-1)',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--c-primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--c-border)'}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label className="font-medium" style={{ display: 'block', fontSize: 13, color: 'var(--c-text-2)', marginBottom: 6 }}>Mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-hint)' }} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  style={{
                    width: '100%', padding: '12px 44px 12px 40px', borderRadius: 12, border: '1.5px solid var(--c-border)',
                    fontSize: 15, fontFamily: 'Poppins, sans-serif', outline: 'none', boxSizing: 'border-box',
                    background: '#fafafa', color: 'var(--c-text-1)',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--c-primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--c-border)'}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-hint)', padding: 0 }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button id="login-submit" type="submit" disabled={loading} className="btn btn-primary w-full" style={{ height: 50, fontSize: 16 }}>
              {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite', marginRight: 8 }} />Đang đăng nhập...</> : '🔐 Đăng nhập'}
            </button>
          </form>

          <p className="text-center" style={{ marginTop: 24, fontSize: 14, color: 'var(--c-text-hint)' }}>
            Chưa có tài khoản?{' '}
            <Link to="/register" style={{ color: 'var(--c-primary)', fontWeight: 600, textDecoration: 'none' }}>Đăng ký ngay</Link>
          </p>
        </div>

        <p className="text-center" style={{ marginTop: 20, fontSize: 12, color: 'var(--c-text-hint)' }}>
          🔒 Bảo mật tuyệt đối · Dữ liệu của bạn được mã hoá
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
