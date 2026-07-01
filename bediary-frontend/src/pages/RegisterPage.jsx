import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../api/api'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', fullName: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.register(form)
      const { token, userId, email, fullName } = res.data
      localStorage.setItem('bediary_token', token)
      localStorage.setItem('bediary_user', JSON.stringify({ userId, email, fullName }))
      navigate('/family-setup')
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px 12px 40px', borderRadius: 12, border: '1.5px solid var(--c-border)',
    fontSize: 15, fontFamily: 'Poppins, sans-serif', outline: 'none', boxSizing: 'border-box',
    background: '#fafafa', color: 'var(--c-text-1)',
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(160deg, #fff5f8 0%, #ffffff 50%, #fff0f5 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px'
    }}>
      <div style={{ position: 'fixed', top: '10%', left: '8%', width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,92,138,0.06)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '10%', right: '8%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,92,138,0.05)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div className="text-center" style={{ marginBottom: 32 }}>
          <div className="anim-float" style={{ fontSize: 56, lineHeight: 1, marginBottom: 12 }}>🌟</div>
          <h1 className="font-bold" style={{ fontSize: 30, color: 'var(--c-primary)', fontFamily: 'Poppins, sans-serif' }}>Bediary</h1>
          <p style={{ color: 'var(--c-text-hint)', fontSize: 14, marginTop: 4 }}>Bắt đầu hành trình ghi nhớ 🌸</p>
        </div>

        <div className="card" style={{ padding: 32, borderRadius: 24 }}>
          <h2 className="font-bold" style={{ fontSize: 22, color: 'var(--c-text-1)', marginBottom: 4 }}>Tạo tài khoản ✨</h2>
          <p style={{ color: 'var(--c-text-hint)', fontSize: 14, marginBottom: 28 }}>Điền thông tin để bắt đầu lưu kỷ niệm</p>

          {error && (
            <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: '#fff0f0', border: '1px solid #ffcccc', color: '#e53935', fontSize: 13, display: 'flex', gap: 8 }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div style={{ marginBottom: 16 }}>
              <label className="font-medium" style={{ display: 'block', fontSize: 13, color: 'var(--c-text-2)', marginBottom: 6 }}>Họ và tên</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-hint)' }} />
                <input id="register-name" type="text" placeholder="Nguyễn Văn A"
                  value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
                  required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--c-primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label className="font-medium" style={{ display: 'block', fontSize: 13, color: 'var(--c-text-2)', marginBottom: 6 }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-hint)' }} />
                <input id="register-email" type="email" placeholder="bo@bediary.app"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--c-primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 28 }}>
              <label className="font-medium" style={{ display: 'block', fontSize: 13, color: 'var(--c-text-2)', marginBottom: 6 }}>Mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-hint)' }} />
                <input id="register-password" type={showPassword ? 'text' : 'password'} placeholder="Tối thiểu 6 ký tự"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  required minLength={6} style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={e => e.target.style.borderColor = 'var(--c-primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-hint)', padding: 0 }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button id="register-submit" type="submit" disabled={loading} className="btn btn-primary w-full" style={{ height: 50, fontSize: 16 }}>
              {loading ? 'Đang tạo tài khoản...' : '🚀 Tạo tài khoản'}
            </button>
          </form>

          <p className="text-center" style={{ marginTop: 24, fontSize: 14, color: 'var(--c-text-hint)' }}>
            Đã có tài khoản?{' '}
            <Link to="/login" style={{ color: 'var(--c-primary)', fontWeight: 600, textDecoration: 'none' }}>Đăng nhập</Link>
          </p>
        </div>

        <p className="text-center" style={{ marginTop: 20, fontSize: 12, color: 'var(--c-text-hint)' }}>
          Bằng cách đăng ký, bạn đồng ý với <span style={{ color: 'var(--c-primary)' }}>Điều khoản sử dụng</span>
        </p>
      </div>
    </div>
  )
}
