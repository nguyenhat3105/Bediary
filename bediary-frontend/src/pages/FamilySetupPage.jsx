import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Users, Baby, Calendar, Copy } from 'lucide-react'
import { familyApi } from '../api/api'

const TABS = [
  { id: 'create', label: 'Hồ sơ mới', icon: Baby },
  { id: 'join',   label: 'Tham gia', icon: Users },
]

const GENDER_OPTIONS = [
  { value: 'MALE',   label: 'Bé trai', emoji: 'boy' },
  { value: 'FEMALE', label: 'Bé gái',  emoji: 'girl' },
]

export default function FamilySetupPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('create')

  // --- Create tab state ---
  const [babyNickname, setBabyNickname] = useState('')
  const [babyGender,   setBabyGender]   = useState('MALE')
  const [babyDob,      setBabyDob]      = useState('')
  const [createResult, setCreateResult] = useState(null)

  // --- Join tab state ---
  const [inviteCode, setInviteCode] = useState('')

  // --- Shared state ---
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // -------------------------------------------------------
  function resetError() { setError('') }

  function unwrap(response) {
    return response?.data ?? response ?? {}
  }

  function getApiError(err, fallback) {
    const data = err?.response?.data
    if (typeof data === 'string') return data
    if (data?.message) return data.message
    if (data?.fieldErrors) return Object.values(data.fieldErrors).join('. ')
    return fallback
  }

  function persistFamilySession(data, role) {
    const familyId = data.familyId || data.id
    if (familyId) {
      localStorage.setItem('bediary_family', JSON.stringify({ familyId }))
    }
    if (data.newToken) {
      localStorage.setItem('bediary_token', data.newToken)
    }
    // Save role so useRole() hook reads correct value immediately
    if (role) {
      try {
        const currentUser = JSON.parse(localStorage.getItem('bediary_user') || '{}')
        localStorage.setItem('bediary_user', JSON.stringify({ ...currentUser, familyId, role }))
      } catch { /* ignore */ }
    }
    return familyId
  }

  // -------------------------------------------------------
  async function handleCreate(e) {
    e.preventDefault()
    resetError()

    if (!babyNickname.trim()) { setError('Vui lòng nhập tên bé.'); return }
    if (!babyDob)             { setError('Vui lòng chọn ngày sinh của bé.'); return }

    setLoading(true)
    try {
      const data = unwrap(await familyApi.create({ babyName: babyNickname.trim(), babyGender, babyDob }))
      const familyId = persistFamilySession(data, 'PARENT')
      setCreateResult({ familyId, inviteCode: data.inviteCode })
    } catch (err) {
      setError(getApiError(err, 'Có lỗi xảy ra. Vui lòng thử lại.'))
    } finally {
      setLoading(false)
    }
  }

  // -------------------------------------------------------
  async function handleJoin(e) {
    e.preventDefault()
    resetError()

    if (!inviteCode.trim()) { setError('Vui lòng nhập mã mời.'); return }

    setLoading(true)
    try {
      const data = unwrap(await familyApi.join({ inviteCode: inviteCode.trim() }))
      persistFamilySession(data, 'VIEWER')
      navigate('/')
    } catch (err) {
      setError(getApiError(err, 'Mã mời không hợp lệ hoặc đã hết hạn.'))
    } finally {
      setLoading(false)
    }
  }

  // -------------------------------------------------------
  function copyInviteCode() {
    if (createResult?.inviteCode) {
      navigator.clipboard.writeText(createResult.inviteCode).catch(() => {})
    }
  }

  // -------------------------------------------------------
  // SUCCESS SCREEN after create
  if (createResult) {
    return (
      <div style={styles.bg}>
        <div style={styles.card}>
          <div style={styles.emojiHeader}>
            <span style={styles.bigEmoji}>🎉</span>
          </div>
          <h1 style={styles.title}>Hồ sơ mới đã được tạo!</h1>
          <p style={styles.subtitle}>
            Chia sẻ mã mời với người thân để họ tham gia nhật ký cùng bạn.
          </p>

          <div style={styles.inviteBox}>
            <span style={styles.inviteLabel}>Mã mời</span>
            <div style={styles.inviteRow}>
              <span style={styles.inviteCodeText}>{createResult.inviteCode}</span>
              <button style={styles.copyBtn} onClick={copyInviteCode} title="Sao chép">
                <Copy size={16} />
              </button>
            </div>
          </div>

          <button style={styles.primaryBtn} onClick={() => navigate('/')}>
            <Heart size={18} style={{ marginRight: 8 }} />
            Bắt đầu nhật ký
          </button>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------
  return (
    <div style={styles.bg}>
      <div style={styles.card}>

        {/* Animated header */}
        <div style={styles.emojiHeader}>
          <span style={styles.bigEmoji} className="emoji-bounce">
            {activeTab === 'create' ? '🍼' : '⭐'}
          </span>
        </div>

        <h1 style={styles.title}>
          {activeTab === 'create' ? 'Tạo thông tin cho bé' : 'Tham gia'}
        </h1>
        <p style={styles.subtitle}>
          {activeTab === 'create'
            ? 'Bắt đầu hành trình lưu trữ cùng bé yêu'
              : 'Nhập mã mời từ thành viên trong gia đình'}
          </p>

        {/* Tab bar */}
        <div style={styles.tabBar}>
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                style={{ ...styles.tabBtn, ...(active ? styles.tabBtnActive : {}) }}
                onClick={() => { setActiveTab(tab.id); resetError() }}
              >
                <Icon size={15} style={{ marginRight: 6 }} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Error */}
        {error && <div style={styles.errorBox}>{error}</div>}

        {/* --- CREATE FORM --- */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreate} style={styles.form}>
            {/* Baby nickname */}
            <div style={styles.field}>
              <label style={styles.label}>
                <Baby size={14} style={{ marginRight: 6 }} />
                Tên gọi yêu của bé
              </label>
              <input
                style={styles.input}
                type="text"
                placeholder="Ví dụ: Bo Bo, Cun Con..."
                value={babyNickname}
                onChange={(e) => setBabyNickname(e.target.value)}
                maxLength={50}
              />
            </div>

            {/* Baby gender */}
            <div style={styles.field}>
              <label style={styles.label}>Giới tính</label>
              <div style={styles.genderRow}>
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    style={{
                      ...styles.genderBtn,
                      ...(babyGender === opt.value ? styles.genderBtnActive : {}),
                    }}
                    onClick={() => setBabyGender(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Baby dob */}
            <div style={styles.field}>
              <label style={styles.label}>
                <Calendar size={14} style={{ marginRight: 6 }} />
                Ngày sinh của bé
              </label>
              <input
                style={styles.input}
                type="date"
                value={babyDob}
                onChange={(e) => setBabyDob(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <button style={{ ...styles.primaryBtn, ...(loading ? styles.btnDisabled : {}) }} type="submit" disabled={loading}>
              {loading ? 'Đang tạo...' : (
                <>
                  <Heart size={16} style={{ marginRight: 8 }} />
                  Xác nhận thông tin
                </>
              )}
            </button>
          </form>
        )}

        {/* --- JOIN FORM --- */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoin} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>
                <Users size={14} style={{ marginRight: 6 }} />
                Mã mời gia đình
              </label>
              <input
                style={{ ...styles.input, letterSpacing: '0.15em', textTransform: 'uppercase' }}
                type="text"
                placeholder="Nhập mã mời..."
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={20}
              />
            </div>

            <button style={{ ...styles.primaryBtn, ...(loading ? styles.btnDisabled : {}) }} type="submit" disabled={loading}>
              {loading ? 'Đang tham gia...' : (
                <>
                  <Users size={16} style={{ marginRight: 8 }} />
                  Tham gia
                </>
              )}
            </button>
          </form>
        )}

        <p style={styles.hint}>
          {activeTab === 'create'
            ? 'Bạn đã có hồ sơ? '
            : 'Chưa có hồ sơ? '}
          <button
            style={styles.switchLink}
            onClick={() => { setActiveTab(activeTab === 'create' ? 'join' : 'create'); resetError() }}
          >
            {activeTab === 'create' ? 'Tham gia ngay' : 'Xác nhận thông tin'}
          </button>
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
        .emoji-bounce { animation: bounce 2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

// -------------------------------------------------------
// Inline styles
// -------------------------------------------------------
const styles = {
  bg: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #FFF5F7 0%, #F0F4FF 50%, #FFF9F0 100%)',
    padding: '24px 16px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  card: {
    background: '#FFFFFF',
    borderRadius: 24,
    boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
    padding: '40px 36px',
    width: '100%',
    maxWidth: 440,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0,
  },
  emojiHeader: {
    marginBottom: 16,
  },
  bigEmoji: {
    fontSize: 56,
    display: 'inline-block',
    lineHeight: 1,
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: 22,
    fontWeight: 700,
    color: '#1A1A2E',
    textAlign: 'center',
  },
  subtitle: {
    margin: '0 0 24px 0',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 1.6,
  },
  tabBar: {
    display: 'flex',
    background: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    width: '100%',
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 12px',
    borderRadius: 9,
    border: 'none',
    background: 'transparent',
    color: '#6B7280',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    background: '#FFFFFF',
    color: '#E91E8C',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    fontWeight: 600,
  },
  errorBox: {
    width: '100%',
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    color: '#DC2626',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    border: '1.5px solid #E5E7EB',
    borderRadius: 10,
    fontSize: 14,
    color: '#1A1A2E',
    outline: 'none',
    background: '#FAFAFA',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  genderRow: {
    display: 'flex',
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    padding: '9px 6px',
    border: '1.5px solid #E5E7EB',
    borderRadius: 10,
    background: '#FAFAFA',
    color: '#6B7280',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  genderBtnActive: {
    border: '1.5px solid #E91E8C',
    background: '#FFF0F8',
    color: '#E91E8C',
    fontWeight: 700,
  },
  primaryBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '13px',
    background: 'linear-gradient(135deg, #E91E8C, #9B59B6)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 4,
    transition: 'opacity 0.2s, transform 0.15s',
    boxShadow: '0 4px 16px rgba(233,30,140,0.30)',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  hint: {
    marginTop: 20,
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  switchLink: {
    background: 'none',
    border: 'none',
    color: '#E91E8C',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 13,
    padding: 0,
    textDecoration: 'underline',
  },
  inviteBox: {
    width: '100%',
    background: '#F9FAFB',
    border: '1.5px solid #E5E7EB',
    borderRadius: 14,
    padding: '16px 18px',
    marginBottom: 24,
    textAlign: 'center',
  },
  inviteLabel: {
    display: 'block',
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 600,
  },
  inviteRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  inviteCodeText: {
    fontSize: 26,
    fontWeight: 800,
    color: '#E91E8C',
    letterSpacing: '0.18em',
  },
  copyBtn: {
    background: '#F3F4F6',
    border: 'none',
    borderRadius: 8,
    padding: '6px 8px',
    cursor: 'pointer',
    color: '#6B7280',
    display: 'flex',
    alignItems: 'center',
  },
}
