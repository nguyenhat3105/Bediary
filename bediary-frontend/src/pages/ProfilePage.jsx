import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Copy, Check, Users, Baby, Crown, Eye, LogOut,
  Camera, Edit2, Share2, X, Trash2, ChevronRight, Plus, Moon, Sun
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { authApi, profileApi, familyApi } from '../api/api'
import { useRole } from '../hooks/useRole'

function unwrap(response) {
  return response?.data ?? response ?? {}
}

function listFromResponse(response) {
  const data = unwrap(response)
  return Array.isArray(data) ? data : data?.content ?? []
}

function roleLabel(role) {
  if (role === 'ADMIN')     return 'Quản trị hệ thống'
  if (role === 'PARENT')    return 'Ba mẹ'
  if (role === 'CAREGIVER') return 'Người chăm sóc'
  return 'Người thân'
}

/* ─── Avatar placeholder ─── */
function Avatar({ src, name, size = 64, onClick, editable = false }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['#FF5C8A', '#FF8FAB', '#E91E8C', '#C2185B', '#AD1457']
  const bg = colors[(name?.charCodeAt(0) || 0) % colors.length]

  return (
    <div onClick={onClick} style={{
      width: size, height: size, borderRadius: '50%',
      background: src ? 'transparent' : bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0, position: 'relative',
      cursor: editable ? 'pointer' : 'default',
      border: '3px solid #fff', boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
    }}>
      {src ? (
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: size * 0.35, fontWeight: 700, color: '#fff', fontFamily: 'Poppins,sans-serif' }}>
          {initials}
        </span>
      )}
      {/* Camera overlay — chỉ hiện khi editable, hiện lên khi hover */}
      {editable && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'rgba(0,0,0,0.32)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0,
          transition: 'opacity 0.18s',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0}
        >
          <Camera size={size * 0.22} color="#fff" />
        </div>
      )}
    </div>
  )
}

/* ─── Invite code card ─── */
function InviteCard({ code }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    if (!code) return
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #FF5C8A 0%, #FF8FAB 100%)',
      borderRadius: 20, padding: '20px 20px 18px', color: '#fff', marginBottom: 16
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 13, opacity: 0.85, margin: '0 0 4px' }}>Mã mời gia đình</p>
          <p style={{ fontSize: 11, opacity: 0.7, margin: 0 }}>Chia sẻ để ông bà, người thân cùng xem nhật ký</p>
        </div>
        <Share2 size={20} style={{ opacity: 0.8 }} />
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.2)', borderRadius: 14,
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backdropFilter: 'blur(4px)'
      }}>
        <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: 4, fontFamily: 'monospace' }}>
          {code || '------'}
        </span>
        <button onClick={copy} style={{
          background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 10,
          width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s'
        }}>
          {copied ? <Check size={18} color="#fff" /> : <Copy size={18} color="#fff" />}
        </button>
      </div>

      {copied && (
        <p style={{ fontSize: 12, textAlign: 'center', marginTop: 8, opacity: 0.9 }}>
          ✓ Đã sao chép mã mời!
        </p>
      )}
    </div>
  )
}

/* ─── Member row ─── */
function BabyJournalSwitcher({ journals, switchingId, onSwitch, onUploadClick, uploadingBabyAvatar }) {
  const { canManage } = useRole()
  return (
    <div style={{
      background: 'var(--c-card-bg)',
      borderRadius: 20,
      padding: '18px 18px 16px',
      border: '1px solid var(--c-card-border)',
      marginBottom: 16,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
    }}>
      <style>{`
        .profile-baby-avatar:hover .profile-baby-avatar__camera,
        .profile-baby-avatar:focus-visible .profile-baby-avatar__camera {
          opacity: 1 !important;
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--c-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Baby size={20} color="var(--c-primary)" />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--c-text-1)', margin: 0 }}>Hồ sơ bé</h3>
            <p style={{ fontSize: 11, color: 'var(--c-text-hint)', margin: '2px 0 0' }}>Chọn bé đang theo dõi</p>
          </div>
        </div>
        <Link
          to="/family-setup"
          aria-label="Thêm hồ sơ bé"
          title="Thêm hồ sơ bé"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#FF5C8A,#FF8FAB)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(255,92,138,0.25)',
            flexShrink: 0,
          }}
        >
          <Plus size={18} />
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(journals || []).map((journal) => {
          const active = Boolean(journal.active)
          const initial = (journal.babyName || 'B').charAt(0).toUpperCase()
          return (
            <button
              key={journal.familyId}
              type="button"
              disabled={switchingId === journal.familyId}
              onClick={() => !active && onSwitch(journal.familyId)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px',
                borderRadius: 16,
                border: active ? '1.5px solid #FF8FAB' : '1px solid var(--c-card-border)',
                background: active ? 'var(--c-primary-pale)' : 'var(--c-card-bg)',
                cursor: active ? 'default' : 'pointer',
                fontFamily: 'Poppins,sans-serif',
                textAlign: 'left',
              }}
            >
              <div
                className="profile-baby-avatar"
                onClick={(e) => {
                  if (active && canManage) {
                    e.stopPropagation()
                    onUploadClick?.()
                  }
                }}
                title={active && canManage ? 'Đổi ảnh đại diện của bé' : undefined}
                style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: active ? 'var(--c-primary)' : 'var(--c-primary-light)',
                color: active ? '#fff' : 'var(--c-primary)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 900,
                fontSize: 18,
                flexShrink: 0,
                overflow: 'hidden',
                position: 'relative',
                cursor: active && canManage ? 'pointer' : 'inherit',
              }}>
                {journal.babyAvatarUrl
                  ? <img src={journal.babyAvatarUrl} alt={journal.babyName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initial}
                {active && canManage && (
                  <span
                    className="profile-baby-avatar__camera"
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: 'rgba(20, 16, 24, 0.36)',
                      display: 'grid',
                      placeItems: 'center',
                      opacity: 0,
                      transition: 'opacity 0.18s ease',
                    }}
                  >
                    <Camera size={17} color="#fff" strokeWidth={2.4} />
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 15, color: 'var(--c-text-1)', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {journal.babyName || 'Bé yêu'}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--c-text-hint)', fontWeight: 600 }}>
                  {uploadingBabyAvatar && active ? 'Đang tải ảnh...' : roleLabel(journal.role)}
                  {journal.babyDob ? ` · ${new Date(journal.babyDob).toLocaleDateString('vi-VN')}` : ''}
                </p>
              </div>
              {active ? (
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-primary)', background: 'var(--c-card-bg)', borderRadius: 999, padding: '5px 9px' }}>
                  Đang chọn
                </span>
              ) : (
                <ChevronRight size={17} color="var(--c-text-hint)" />
              )}
            </button>
          )
        })}
      </div>

      <Link
        to="/family-setup"
        style={{
          marginTop: 12,
          width: '100%',
          height: 44,
          borderRadius: 14,
          border: '1.5px dashed #FFB3CE',
          background: 'var(--c-primary-pale)',
          color: '#FF5C8A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 800,
        }}
      >
        <Plus size={16} /> Thêm hồ sơ bé mới
      </Link>
    </div>
  )
}

function MemberRow({ member, isMe, canRemove, canChangeRole, onRemove, onChangeRole }) {
  const isAdmin = member.role === 'ADMIN'
  const isParentRole = member.role === 'PARENT'
  const roleColors = {
    ADMIN:     { color: '#E65100', icon: <span style={{ fontSize: 11 }}>🛡️</span>, label: 'Quản trị hệ thống' },
    PARENT:    { color: '#FF5C8A', icon: <Crown size={11} color="#FF5C8A" />, label: 'Ba mẹ' },
    CAREGIVER: { color: '#7C3AED', icon: <span style={{ fontSize: 11 }}>🤲</span>, label: 'Người chăm sóc' },
    VIEWER:    { color: 'var(--c-text-hint)', icon: <Eye size={11} color="var(--c-text-hint)" />, label: 'Người thân' },
  }
  const rc = roleColors[member.role] || roleColors.VIEWER

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
      borderBottom: '1px solid var(--c-card-border)'
    }}>
      <Avatar src={member.avatarUrl} name={member.fullName} size={46} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-text-1)', margin: 0 }}>
            {member.fullName || 'Người dùng'}
          </p>
          {isMe && (
            <span style={{ fontSize: 10, background: 'var(--c-primary-light)', color: 'var(--c-primary)', padding: '1px 6px', borderRadius: 999, fontWeight: 600 }}>
              Bạn
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
          {rc.icon}
          <span style={{ fontSize: 12, color: rc.color, fontWeight: 500 }}>{rc.label}</span>
        </div>
      </div>

      {canChangeRole && !isMe && !isAdmin && !isParentRole && (
        <select
          value={member.role}
          onChange={(event) => onChangeRole(member, event.target.value)}
          style={{
            fontSize: 11,
            fontWeight: 700,
            border: '1.5px solid #F0E8F0',
            borderRadius: 10,
            padding: '6px 8px',
            background: 'var(--c-surface)',
            color: member.role === 'CAREGIVER' ? '#7C3AED' : 'var(--c-text-hint)',
            outline: 'none',
          }}
        >
          <option value="VIEWER">Người thân</option>
          <option value="CAREGIVER">Người chăm sóc</option>
        </select>
      )}

      {canRemove && !isMe && !isAdmin && !isParentRole && (
        <button onClick={() => onRemove(member)} style={{
          background: 'var(--c-error-bg)', border: 'none', borderRadius: 10,
          width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}>
          <Trash2 size={15} color="#C9335C" />
        </button>
      )}
    </div>
  )
}

/* ─── Main ProfilePage ─── */
export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [journals, setJournals] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [editName, setEditName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBabyAvatar, setUploadingBabyAvatar] = useState(false)
  const [switchingId, setSwitchingId] = useState(null)
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('bediary_theme')
    if (savedTheme) return savedTheme === 'dark'
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })
  const { isAdmin, isParent, isCaregiver, isViewer, canManage } = useRole()
  const fileRef = useRef(null)
  const babyAvatarRef = useRef(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [profileRes, journalsRes] = await Promise.allSettled([
        profileApi.get(),
        familyApi.myJournals(),
      ])
      if (profileRes.status === 'fulfilled') {
        setProfile(unwrap(profileRes.value))
      } else {
        throw profileRes.reason
      }
      if (journalsRes.status === 'fulfilled') {
        setJournals(listFromResponse(journalsRes.value))
      }
    } catch {
      showToast('Không thể tải thông tin', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light'
    document.documentElement.dataset.theme = theme
    localStorage.setItem('bediary_theme', theme)
  }, [darkMode])

  const handleSaveName = async () => {
    if (!nameInput.trim()) return
    setSaving(true)
    try {
      await profileApi.update({ fullName: nameInput.trim() })
      showToast('Đã cập nhật tên!')
      setEditName(false)
      await load()
    } catch {
      showToast('Lưu thất bại', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn file ảnh', 'error')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Ảnh đại diện tối đa 5MB', 'error')
      return
    }

    try {
      setUploadingAvatar(true)
      const res = await profileApi.uploadAvatar(file)
      const updatedProfile = res.data
      setProfile(updatedProfile)

      try {
        const currentUser = JSON.parse(localStorage.getItem('bediary_user') || '{}')
        localStorage.setItem('bediary_user', JSON.stringify({
          ...currentUser,
          fullName: updatedProfile.fullName,
          avatarUrl: updatedProfile.avatarUrl,
        }))
      } catch {
        /* ignore local storage sync errors */
      }

      showToast('Đã cập nhật ảnh đại diện!')
    } catch (err) {
      showToast(err.response?.data?.message || 'Upload avatar thất bại', 'error')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleBabyAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn file ảnh', 'error')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Ảnh của bé tối đa 5MB', 'error')
      return
    }

    try {
      setUploadingBabyAvatar(true)
      await familyApi.uploadBabyAvatar(file)
      showToast('Đã cập nhật ảnh của bé!')
      await load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Upload ảnh của bé thất bại', 'error')
    } finally {
      setUploadingBabyAvatar(false)
    }
  }

  const handleRemoveMember = async () => {
    if (!removeTarget) return
    try {
      await familyApi.removeMember(removeTarget.id)
      showToast(`Đã xóa ${removeTarget.fullName}`)
      setRemoveTarget(null)
      await load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Xóa thất bại', 'error')
    }
  }

  const handleChangeRole = async (member, newRole) => {
    try {
      await familyApi.changeMemberRole(member.userId || member.id, newRole)
      const label = newRole === 'CAREGIVER' ? 'Người chăm sóc' : 'Người thân'
      showToast(`Đã đổi vai trò của ${member.fullName || 'thành viên'} thành ${label}`)
      await load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Không thể đổi vai trò', 'error')
    }
  }


  const handleSwitchJournal = async (familyId) => {
    if (!familyId || switchingId) return
    try {
      setSwitchingId(familyId)
      const res = await familyApi.switchJournal(familyId)
      const data = unwrap(res)
      if (data.newToken) localStorage.setItem('bediary_token', data.newToken)
      localStorage.setItem('bediary_family', JSON.stringify({ familyId: data.familyId || familyId }))
      try {
        const currentUser = JSON.parse(localStorage.getItem('bediary_user') || '{}')
        localStorage.setItem('bediary_user', JSON.stringify({
          ...currentUser,
          familyId: data.familyId || familyId,
        }))
      } catch {
        /* ignore local storage sync errors */
      }
      showToast('Đã chuyển hồ sơ bé')
      await load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Không thể chuyển hồ sơ bé', 'error')
    } finally {
      setSwitchingId(null)
    }
  }

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Local cleanup still happens even if the backend session already expired.
    } finally {
      localStorage.removeItem('bediary_token')
      localStorage.removeItem('bediary_user')
      window.location.href = '/login'
    }
  }

  const babyGenderEmoji = profile?.babyGender === 'FEMALE' ? '👧' : '👦'

  return (
    <div style={{ background: 'var(--c-bg)', minHeight: '100vh' }}>
      <Navbar />

      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 430, margin: '0 auto', padding: '76px 20px 120px' }}>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', paddingTop: 40 }}>
            <div className="skeleton" style={{ width: 120, height: 120, borderRadius: '50%' }} />
            <div className="skeleton" style={{ width: 160, height: 20, borderRadius: 10 }} />
            <div className="skeleton" style={{ width: 100, height: 14, borderRadius: 8 }} />
            <div className="skeleton" style={{ width: '100%', height: 130, borderRadius: 20, marginTop: 16 }} />
            <div className="skeleton" style={{ width: '100%', height: 200, borderRadius: 20 }} />
          </div>
        ) : (
          <>
            {/* ── Hero section: Avatar + Name ── */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8, marginBottom: 28 }}>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <Avatar
                  src={profile?.avatarUrl}
                  name={profile?.fullName}
                  size={120}
                  editable
                  onClick={() => !uploadingAvatar && fileRef.current?.click()}
                />
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                {uploadingAvatar && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.74)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                    color: 'var(--c-primary)',
                  }}>
                    Đang tải...
                  </div>
                )}
              </div>

              {editName ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', maxWidth: 260 }}>
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                    className="input"
                    style={{ flex: 1, textAlign: 'center', fontSize: 16 }}
                    placeholder="Tên của bạn"
                  />
                  <button onClick={handleSaveName} disabled={saving} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
                    {saving ? '...' : <Check size={16} />}
                  </button>
                  <button onClick={() => setEditName(false)} className="btn-icon" style={{ flexShrink: 0 }}>
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--c-text-1)', margin: 0 }}>
                    {profile?.fullName || 'Người dùng'}
                  </h2>
                  <button
                    onClick={() => { setNameInput(profile?.fullName || ''); setEditName(true) }}
                    className="btn-icon" style={{ width: 30, height: 30 }}
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              )}

              <p style={{ fontSize: 13, color: 'var(--c-text-hint)', marginTop: 4 }}>
                {profile?.email}
              </p>

              {/* Role badge */}
              {isAdmin && (
                <span style={{
                  marginTop: 8, fontSize: 12, fontWeight: 700,
                  background: 'linear-gradient(135deg, #E65100, #FF8A50)',
                  color: '#fff', padding: '4px 14px', borderRadius: 999,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span style={{ fontSize: 13 }}>🛡️</span> Quản trị hệ thống
                </span>
              )}
              {isParent && (
                <span style={{
                  marginTop: 8, fontSize: 12, fontWeight: 700,
                  background: 'linear-gradient(135deg, #FF5C8A, #FF8FAB)',
                  color: '#fff', padding: '4px 14px', borderRadius: 999,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <Crown size={12} /> Ba mẹ
                </span>
              )}
              {isCaregiver && (
                <span style={{
                  marginTop: 8, fontSize: 12, fontWeight: 700,
                  background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
                  color: '#fff', padding: '4px 14px', borderRadius: 999,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span style={{ fontSize: 13 }}>🤲</span> Người chăm sóc
                </span>
              )}
              {isViewer && (
                <span style={{
                  marginTop: 8, fontSize: 12, fontWeight: 700,
                  background: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
                  color: '#fff', padding: '4px 14px', borderRadius: 999,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <Eye size={12} /> Người thân
                </span>
              )}
            </div>

            <BabyJournalSwitcher
              journals={journals}
              switchingId={switchingId}
              onSwitch={handleSwitchJournal}
              onUploadClick={() => babyAvatarRef.current?.click()}
              uploadingBabyAvatar={uploadingBabyAvatar}
            />
            <input ref={babyAvatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBabyAvatarChange} />

            {/* ── Mã mời — chỉ hiện với Ba mẹ và Quản trị ── */}
            {canManage && profile?.inviteCode && <InviteCard code={profile.inviteCode} />}

            {/* ── Thông tin bé ── */}
            {profile?.babyName && (
              <div style={{ background: 'var(--c-card-bg)', borderRadius: 20, padding: '18px 20px', border: '1px solid var(--c-card-border)', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--c-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    <Baby size={20} color="var(--c-primary)" />
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text-1)' }}>Thông tin bé</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Tên bé', value: `${babyGenderEmoji} ${profile.babyName}` },
                    { label: 'Tuổi', value: profile.babyAgeText || '--' },
                    { label: 'Ngày sinh', value: profile.babyDob ? new Date(profile.babyDob).toLocaleDateString('vi-VN') : '--' },
                    { label: 'Giới tính', value: profile.babyGender === 'FEMALE' ? '👧 Bé gái' : '👦 Bé trai' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: 'var(--c-primary-pale)', borderRadius: 12, padding: '10px 14px' }}>
                      <p style={{ fontSize: 11, color: 'var(--c-text-hint)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-1)', margin: 0 }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Thành viên gia đình ── */}
            <div style={{ background: 'var(--c-card-bg)', borderRadius: 20, padding: '18px 20px', border: '1px solid var(--c-card-border)', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--c-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={20} color="var(--c-primary)" />
                  </div>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text-1)' }}>Thành viên</span>
                    <span style={{ fontSize: 12, color: 'var(--c-text-hint)', marginLeft: 6 }}>
                      {profile?.members?.length || 0} người
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                {(profile?.members || []).map((m, i) => (
                  <MemberRow
                    key={m.id || i}
                    member={m}
                    isMe={(m.userId || m.id) === profile.userId}
                    canRemove={canManage}
                    canChangeRole={canManage}
                    onRemove={setRemoveTarget}
                    onChangeRole={handleChangeRole}
                  />
                ))}
                {(!profile?.members || profile.members.length === 0) && (
                  <p style={{ fontSize: 13, color: 'var(--c-text-hint)', textAlign: 'center', padding: '16px 0' }}>
                    Chưa có thành viên nào. Chia sẻ mã mời bên trên!
                  </p>
                )}
              </div>

              {/* Hướng dẫn */}
              <div style={{ background: 'var(--c-primary-pale)', borderRadius: 12, padding: '12px 14px', marginTop: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18 }}>💡</span>
                <p style={{ fontSize: 12, color: 'var(--c-primary)', margin: 0, lineHeight: 1.6 }}>
                  Chia sẻ <strong>mã mời</strong> để ông bà, người thân tải Bediary và nhập mã để cùng xem nhật ký của bé. Họ sẽ có vai trò <strong>Người xem</strong>.
                </p>
              </div>
            </div>

            {/* ── Cài đặt ── */}
            <div style={{ background: 'var(--c-card-bg)', borderRadius: 20, border: '1px solid var(--c-card-border)', overflow: 'hidden', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
              <button
                type="button"
                className="theme-toggle-row"
                onClick={() => setDarkMode(value => !value)}
                aria-pressed={darkMode}
                style={{ borderBottom: '1px solid var(--c-card-border)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <span style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'var(--c-primary-light)',
                    color: 'var(--c-primary)',
                    flexShrink: 0,
                  }}>
                    {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                  </span>
                  <span>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--c-text-1)' }}>
                      Giao diện tối
                    </span>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--c-text-hint)', marginTop: 2 }}>
                      Dịu mắt hơn khi chăm bé ban đêm
                    </span>
                  </span>
                </div>
                <span className={`theme-toggle ${darkMode ? 'is-dark' : ''}`} aria-hidden="true">
                  <span className="theme-toggle__thumb">
                    {darkMode ? <Moon size={13} /> : <Sun size={13} />}
                  </span>
                </span>
              </button>
              {[
                { icon: '🔔', label: 'Thông báo', action: () => {} },
                { icon: '🔒', label: 'Bảo mật & Quyền riêng tư', action: () => {} },
                { icon: '❓', label: 'Trợ giúp & Hỗ trợ', action: () => {} },
              ].map(({ icon, label, action, highlight }, i) => (
                <button key={i} onClick={action} style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '15px 20px',
                  borderBottom: i < 2 ? '1px solid var(--c-card-border)' : 'none',
                  fontFamily: 'Poppins,sans-serif'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: highlight ? 'var(--c-primary)' : 'var(--c-text-1)' }}>
                      {label}
                    </span>
                  </div>
                  <ChevronRight size={16} color={highlight ? 'var(--c-primary)' : 'var(--c-text-hint)'} />
                </button>
              ))}
            </div>

            {/* ── Đăng xuất ── */}
            <button onClick={handleLogout} style={{
              width: '100%', background: 'var(--c-error-bg)', border: '1px solid var(--c-card-border)', borderRadius: 16,
              padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: 15, fontWeight: 600, color: '#C9335C'
            }}>
              <LogOut size={18} /> Đăng xuất
            </button>

            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--c-text-hint)', marginTop: 16 }}>
              Bediary v1.0 · Bảo vệ dữ liệu gia đình bạn 🔒
            </p>
          </>
        )}
      </div>

      {/* ── Confirm remove modal ── */}
      {removeTarget && (
        <div className="modal-overlay" onClick={() => setRemoveTarget(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '28px 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-text-1)', margin: '0 0 8px' }}>
                Xóa thành viên?
              </h3>
              <p style={{ fontSize: 14, color: 'var(--c-text-2)', margin: 0, lineHeight: 1.6 }}>
                <strong>{removeTarget.fullName}</strong> sẽ không còn xem được nhật ký của bé. Họ cần mã mời mới để tham gia lại.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setRemoveTarget(null)} className="btn btn-ghost" style={{ flex: 1, height: 48 }}>
                Huỷ
              </button>
              <button onClick={handleRemoveMember} style={{
                flex: 1, height: 48, background: '#C9335C', border: 'none', borderRadius: 14,
                color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins,sans-serif'
              }}>
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
