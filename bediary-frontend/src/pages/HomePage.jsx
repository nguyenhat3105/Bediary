import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Baby,
  Bath,
  Bell,
  Camera,
  CalendarDays,
  Check,
  ChevronRight,
  ChevronsUpDown,
  CircleDot,
  Droplets,
  Image,
  Moon,
  Plus,
  Ruler,
  Scale,
  Syringe,
  Utensils,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { dashboardApi, familyApi, profileApi, routineApi, trackingApi, vaccinationApi } from '../api/api'
import { VACCINE_SCHEDULE } from './VaccinationPage'

const ACTIVITY_META = {
  FEED: { label: 'Ăn / bú', Icon: Utensils, bg: '#FFF0F5', color: '#FF5C8A' },
  SLEEP: { label: 'Ngủ', Icon: Moon, bg: '#F2F0FF', color: '#7C6DFF' },
  BATH: { label: 'Tắm', Icon: Bath, bg: '#EAF6FF', color: '#1D9BF0' },
  MEDICINE: { label: 'Thuốc', Icon: Bell, bg: '#EAF8EF', color: '#20A06B' },
  PEE: { label: 'Đi tiểu', Icon: Droplets, bg: '#EAF6FF', color: '#0EA5E9' },
  POOP: { label: 'Đi tiêu', Icon: CircleDot, bg: '#FFF7E8', color: '#F59E0B' },
  DIAPER: { label: 'Tã', Icon: Droplets, bg: '#FFF7E8', color: '#F59E0B' },
  CUSTOM: { label: 'Hoạt động', Icon: CalendarDays, bg: '#FFF7E8', color: '#F59E0B' },
}

function unwrap(response) {
  return response?.data ?? response ?? {}
}

function listFromResponse(response) {
  const data = unwrap(response)
  return Array.isArray(data) ? data : data?.content ?? []
}

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

function addMonths(date, months) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function toDateInput(date) {
  return new Date(date).toISOString().slice(0, 10)
}

function daysUntil(dateValue) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateValue)
  date.setHours(0, 0, 0, 0)
  return Math.round((date - today) / 86400000)
}

function formatDate(dateValue) {
  if (!dateValue) return '--'
  return new Date(dateValue).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTime(value) {
  if (!value) return 'Cả ngày'
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function routineTime(value) {
  return value ? String(value).slice(0, 5) : 'Cả ngày'
}

function getRoutineName(routine) {
  return routine.name || routine.label || ACTIVITY_META[routine.type || routine.activityType]?.label || 'Lịch sinh hoạt'
}

function getMeta(type) {
  return ACTIVITY_META[type] || ACTIVITY_META.CUSTOM
}

function logTitle(log) {
  const meta = getMeta(log.activityType)
  const details = log.metadata || {}
  if (log.activityType === 'FEED') {
    return details.food || details.meal || details.note || details.milkMl ? 'Ăn / bú' : meta.label
  }
  return details.note || meta.label
}

function logSubtitle(log) {
  const details = log.metadata || {}
  const parts = []
  if (details.milkMl || details.amountMl || details.ml) parts.push(`${details.milkMl || details.amountMl || details.ml} ml`)
  if (details.food || details.meal) parts.push(details.food || details.meal)
  if (details.diaperType) parts.push(details.diaperType)
  if (log.createdByName) parts.push(log.createdByName)
  return parts.join(' · ') || 'Đã ghi vào nhật ký'
}

function roleLabel(role) {
  if (role === 'ADMIN') return 'Quản trị hệ thống'
  if (role === 'PARENT') return 'Ba mẹ'
  if (role === 'CAREGIVER') return 'Người chăm sóc'
  return 'Người xem'
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('bediary_user') || '{}')
  } catch {
    return {}
  }
}

function BabyAvatar({ name, src, onClick, canEdit = true, uploading = false }) {
  const initial = (name || 'B').trim().charAt(0).toUpperCase()
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canEdit || uploading}
      aria-label={canEdit ? 'Cập nhật ảnh đại diện của bé' : 'Bạn không có quyền cập nhật ảnh đại diện của bé'}
      title={canEdit ? 'Cập nhật ảnh đại diện của bé' : 'Bạn không có quyền cập nhật ảnh đại diện của bé'}
      className="home-baby-avatar"
      style={{
        width: 122,
        height: 122,
        borderRadius: '50%',
        background: 'linear-gradient(145deg, #FFE1EA, #FFF8FB)',
        border: '4px solid #fff',
        boxShadow: '0 12px 28px rgba(255,92,138,0.18)',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        textDecoration: 'none',
        padding: 0,
        cursor: canEdit && !uploading ? 'pointer' : 'not-allowed',
      }}
    >
      {src ? (
        <img src={src} alt={name || 'Avatar của bé'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'linear-gradient(145deg, #FF7AA2, #FF4F83)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: 48,
            fontWeight: 900,
          }}
        >
          {initial}
        </div>
      )}
      <span
        className="home-baby-avatar__camera"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'rgba(20, 16, 24, 0.38)',
          display: 'grid',
          placeItems: 'center',
          opacity: uploading ? 1 : 0,
          transition: 'opacity 0.18s ease',
        }}
      >
        {uploading ? (
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>...</span>
        ) : (
          <Camera size={30} color="#fff" strokeWidth={2.4} />
        )}
      </span>
    </button>
  )
}

export default function HomePage() {
  const [dashboard, setDashboard] = useState(null)
  const [journals, setJournals] = useState([])
  const [switchOpen, setSwitchOpen] = useState(false)
  const [switchingId, setSwitchingId] = useState(null)
  const [vaccinationRecords, setVaccinationRecords] = useState([])
  const [trackingLogs, setTrackingLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loggingId, setLoggingId] = useState(null)
  const [loggedIds, setLoggedIds] = useState([])
  const [uploadingBabyAvatar, setUploadingBabyAvatar] = useState(false)
  const babyAvatarInputRef = useRef(null)

  useEffect(() => {
    loadHome()
  }, [])

  async function loadHome() {
    setLoading(true)
    try {
      const [dashboardRes, vaccinationsRes, trackingRes, profileRes, journalsRes] = await Promise.allSettled([
        dashboardApi.get(),
        vaccinationApi.list(),
        trackingApi.daily(todayInput()),
        profileApi.get(),
        familyApi.myJournals(),
      ])

      if (dashboardRes.status === 'fulfilled') setDashboard(unwrap(dashboardRes.value))
      if (vaccinationsRes.status === 'fulfilled') setVaccinationRecords(listFromResponse(vaccinationsRes.value))
      if (trackingRes.status === 'fulfilled') setTrackingLogs(listFromResponse(trackingRes.value))
      if (journalsRes.status === 'fulfilled') setJournals(listFromResponse(journalsRes.value))
      if (profileRes.status === 'fulfilled') syncUserProfile(unwrap(profileRes.value))
    } finally {
      setLoading(false)
    }
  }

  function syncUserProfile(nextProfile) {
    try {
      const currentUser = getUser()
      localStorage.setItem('bediary_user', JSON.stringify({
        ...currentUser,
        userId: currentUser.userId || nextProfile.userId,
        email: currentUser.email || nextProfile.email,
        fullName: nextProfile.fullName || currentUser.fullName,
        avatarUrl: nextProfile.avatarUrl || currentUser.avatarUrl,
        role: nextProfile.role || currentUser.role,
      }))
    } catch {
      /* ignore local storage sync errors */
    }
  }

  async function handleLog(routine) {
    if (loggingId === routine.id || loggedIds.includes(routine.id)) return
    try {
      setLoggingId(routine.id)
      await routineApi.log(routine.id, { routineId: routine.id, executedAt: new Date().toISOString(), note: '' })
      setLoggedIds((prev) => [...prev, routine.id])
      await loadHome()
    } finally {
      setLoggingId(null)
    }
  }

  async function handleSwitchJournal(familyId) {
    if (!familyId || switchingId) return
    try {
      setSwitchingId(familyId)
      const response = await familyApi.switchJournal(familyId)
      const data = unwrap(response)
      if (data.newToken) localStorage.setItem('bediary_token', data.newToken)
      localStorage.setItem('bediary_family', JSON.stringify({ familyId: data.familyId || familyId }))
      try {
        const currentUser = getUser()
        localStorage.setItem('bediary_user', JSON.stringify({ ...currentUser, familyId: data.familyId || familyId }))
      } catch {
        /* ignore local storage sync errors */
      }
      setSwitchOpen(false)
      await loadHome()
    } finally {
      setSwitchingId(null)
    }
  }

  function openBabyAvatarPicker() {
    if (!canUpdateBabyAvatar || uploadingBabyAvatar) return
    babyAvatarInputRef.current?.click()
  }

  async function handleBabyAvatarChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      window.alert('Vui lòng chọn file ảnh')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      window.alert('Ảnh của bé tối đa 5MB')
      return
    }

    try {
      setUploadingBabyAvatar(true)
      await familyApi.uploadBabyAvatar(file)
      await loadHome()
    } catch (err) {
      window.alert(err.response?.data?.message || 'Upload ảnh của bé thất bại')
    } finally {
      setUploadingBabyAvatar(false)
    }
  }

  const activeJournal = journals.find((journal) => journal.active)
  const user = getUser()
  const currentRole = activeJournal?.role || user.role
  const canUpdateBabyAvatar = ['ADMIN', 'PARENT', 'CAREGIVER'].includes(currentRole)
  const babyName = dashboard?.babyNickname || dashboard?.babyName || activeJournal?.babyName || 'Bé yêu'
  const babyAvatarUrl = dashboard?.babyAvatarUrl || activeJournal?.babyAvatarUrl || ''
  const babyAgeText = dashboard?.babyAgeText || ''
  const babyDob = dashboard?.babyDob || dashboard?.babyBirthday || activeJournal?.babyDob
  const todayRoutines = dashboard?.todayRoutines || []
  const latestPosts = dashboard?.latestPosts || []
  const growthReminder = Boolean(dashboard?.growthReminder)

  const upcomingVaccinations = useMemo(() => {
    const recordByKey = new Map()
    vaccinationRecords.forEach((record) => {
      if (record.scheduleKey) recordByKey.set(record.scheduleKey, record)
    })

    const dob = babyDob ? new Date(babyDob) : new Date()
    return VACCINE_SCHEDULE.map((item) => {
      const record = recordByKey.get(item.key)
      const scheduledDate = record?.scheduledDate || toDateInput(addMonths(dob, item.months))
      return { ...item, record, scheduledDate, completedAt: record?.completedAt, daysLeft: daysUntil(scheduledDate) }
    })
      .filter((item) => !item.completedAt && item.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 2)
  }, [babyDob, vaccinationRecords])

  const todayCards = useMemo(() => {
    const logCards = trackingLogs.map((log) => ({ type: 'log', key: log.id, log }))
    const routineCards = todayRoutines
      .filter((routine) => !loggedIds.includes(routine.id))
      .map((routine) => ({ type: 'routine', key: routine.id, routine }))
    return [...logCards, ...routineCards].slice(0, 12)
  }, [trackingLogs, todayRoutines, loggedIds])

  const nextVaccination = upcomingVaccinations[0]

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ padding: '24px 20px' }}>
          <div className="skeleton" style={{ height: 150, borderRadius: 24, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 110, borderRadius: 20, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 220, borderRadius: 20 }} />
        </div>
        <Navbar />
      </div>
    )
  }

  return (
    <div className="page-container" style={{ background: '#FFF7F9' }}>
      <style>{`
        .home-baby-avatar:hover .home-baby-avatar__camera,
        .home-baby-avatar:focus-visible .home-baby-avatar__camera {
          opacity: 1 !important;
        }
      `}</style>
      <main style={{ padding: '22px 16px 112px' }}>
        <section style={{ background: 'linear-gradient(160deg, #FFFFFF 0%, #FFF1F6 100%)', border: '1px solid #FFE1EA', borderRadius: 28, padding: 20, boxShadow: '0 18px 42px rgba(255,92,138,0.12)', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <BabyAvatar
              name={babyName}
              src={babyAvatarUrl}
              onClick={openBabyAvatarPicker}
              canEdit={canUpdateBabyAvatar}
              uploading={uploadingBabyAvatar}
            />
            <input
              ref={babyAvatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleBabyAvatarChange}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => journals.length > 1 && setSwitchOpen((open) => !open)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    margin: 0,
                    cursor: journals.length > 1 ? 'pointer' : 'default',
                    maxWidth: '100%',
                    fontFamily: 'inherit',
                  }}
                >
                  <h1 style={{ margin: 0, fontSize: 25, fontWeight: 900, color: '#232026', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {babyName}
                  </h1>
                  {journals.length > 1 && <ChevronsUpDown size={17} color="#FF5C8A" />}
                </button>

                {switchOpen && journals.length > 1 && (
                  <div style={{ position: 'absolute', top: 36, left: 0, right: -12, zIndex: 30, background: '#fff', border: '1px solid #FFE1EA', borderRadius: 18, boxShadow: '0 18px 40px rgba(35,28,34,0.14)', padding: 8 }}>
                    {journals.map((journal) => (
                      <button
                        key={journal.familyId}
                        type="button"
                        disabled={switchingId === journal.familyId || journal.active}
                        onClick={() => handleSwitchJournal(journal.familyId)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, border: 'none', borderRadius: 14, padding: '10px 10px', background: journal.active ? '#FFF0F5' : '#fff', cursor: journal.active ? 'default' : 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FF5C8A', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900, overflow: 'hidden', flexShrink: 0 }}>
                          {journal.babyAvatarUrl
                            ? <img src={journal.babyAvatarUrl} alt={journal.babyName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (journal.babyName || 'B').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#232026', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {journal.babyName}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: '#8D848E' }}>
                            {roleLabel(journal.role)}
                          </p>
                        </div>
                        {journal.active && <Check size={17} color="#FF5C8A" />}
                      </button>
                    ))}
                    <Link to="/family-setup" style={{ marginTop: 4, display: 'flex', justifyContent: 'center', borderRadius: 14, padding: '10px', textDecoration: 'none', color: '#FF5C8A', fontSize: 13, fontWeight: 900, background: '#FFF7F9' }}>
                      + Thêm hồ sơ cho bé
                    </Link>
                  </div>
                )}
              </div>
              <p style={{ margin: '8px 0 4px', fontSize: 15, fontWeight: 800, color: '#514A54' }}>
                {babyAgeText || 'Chưa có tuổi'}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#8D848E' }}>
                Ngày sinh {formatDate(babyDob)}
              </p>
              {activeJournal?.role && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#FF5C8A', fontWeight: 800 }}>
                  {roleLabel(activeJournal.role)}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
            <Link to="/growth" style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: 12, border: '1px solid #FFE3EB' }}>
                <Scale size={19} color="#FF5C8A" />
                <p style={{ margin: '7px 0 0', fontSize: 12, color: '#756D77', fontWeight: 700 }}>Tăng trưởng</p>
              </div>
            </Link>
            <Link to="/tracking" style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: 12, border: '1px solid #FFE3EB' }}>
                <CalendarDays size={19} color="#FF5C8A" />
                <p style={{ margin: '7px 0 0', fontSize: 12, color: '#756D77', fontWeight: 700 }}>Nhật ký hôm nay</p>
              </div>
            </Link>
          </div>
        </section>

        {nextVaccination && (
          <Link to="/vaccinations" style={{ textDecoration: 'none' }}>
            <section style={{ background: '#FFEFF4', border: '1px solid #FFD5E2', borderRadius: 22, padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 5px', fontSize: 13, color: '#7A4658', fontWeight: 800 }}>
                  {nextVaccination.daysLeft === 0 ? 'Hôm nay đến lịch tiêm' : `Còn ${nextVaccination.daysLeft} ngày nữa`}
                </p>
                <h2 style={{ margin: '0 0 10px', fontSize: 16, lineHeight: 1.35, color: '#2D252B', fontWeight: 900 }}>
                  {nextVaccination.name}{nextVaccination.doseNumber > 0 ? ` mũi ${nextVaccination.doseNumber}` : ''}
                </h2>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 999, background: '#FF5C8A', color: '#fff', padding: '8px 12px', fontSize: 12, fontWeight: 900 }}>
                  Xem chi tiết <ChevronRight size={13} />
                </span>
              </div>
              <div style={{ width: 72, height: 72, borderRadius: 24, background: '#FFDCE7', color: '#FF5C8A', display: 'grid', placeItems: 'center', transform: 'rotate(-8deg)', flexShrink: 0 }}>
                <Syringe size={38} />
              </div>
            </section>
          </Link>
        )}

        <section style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: '#211D23', fontWeight: 900 }}>Hôm nay của bé</h2>
            <Link to="/tracking" style={{ color: '#FF5C8A', textDecoration: 'none', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 2 }}>
              Xem thêm <ChevronRight size={14} />
            </Link>
          </div>

          <div style={{ background: '#fff', border: '1px solid #F2E5EA', borderRadius: 22, padding: 12, maxHeight: 292, overflowY: 'auto', boxShadow: '0 10px 28px rgba(35,28,34,0.05)' }}>
            {todayCards.length === 0 ? (
              <div className="empty-state" style={{ padding: '28px 10px' }}>
                <CalendarDays size={42} color="#FF8FAB" />
                <p className="empty-state-title">Không có lịch hôm nay</p>
                <p className="empty-state-desc">Thêm lịch sinh hoạt hoặc ghi nhật ký để theo dõi bé yêu.</p>
                <Link to="/routines" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                  <Plus size={15} /> Thêm lịch
                </Link>
              </div>
            ) : todayCards.map((card, index) => {
              if (card.type === 'log') {
                const meta = getMeta(card.log.activityType)
                const Icon = meta.Icon
                return (
                  <article key={card.key} style={{ display: 'grid', gridTemplateColumns: '42px 56px 1fr', gap: 10, alignItems: 'center', padding: '10px 4px', borderBottom: index < todayCards.length - 1 ? '1px solid #F6ECF0' : 'none' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 14, background: meta.bg, color: meta.color, display: 'grid', placeItems: 'center' }}>
                      <Icon size={20} />
                    </div>
                    <strong style={{ fontSize: 13, color: '#514A54' }}>{formatTime(card.log.startTime)}</strong>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, color: '#2D292F', fontWeight: 900 }}>{logTitle(card.log)}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: '#8D848E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {logSubtitle(card.log)}
                      </p>
                    </div>
                  </article>
                )
              }

              const meta = getMeta(card.routine.activityType)
              const Icon = meta.Icon
              const done = loggedIds.includes(card.routine.id) || card.routine.logged
              return (
                <article key={card.key} style={{ display: 'grid', gridTemplateColumns: '42px 56px 1fr auto', gap: 10, alignItems: 'center', padding: '10px 4px', borderBottom: index < todayCards.length - 1 ? '1px solid #F6ECF0' : 'none' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 14, background: meta.bg, color: meta.color, display: 'grid', placeItems: 'center' }}>
                    <Icon size={20} />
                  </div>
                  <strong style={{ fontSize: 13, color: '#514A54' }}>{routineTime(card.routine.scheduledTime)}</strong>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, color: '#2D292F', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getRoutineName(card.routine)}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9A929C' }}>{meta.label}</p>
                  </div>
                  <button onClick={() => handleLog(card.routine)} disabled={done || loggingId === card.routine.id} style={{ border: 'none', borderRadius: 999, padding: '8px 10px', background: done ? '#EAF8EF' : '#FF5C8A', color: done ? '#2A9D59' : '#fff', fontSize: 12, fontWeight: 900, minWidth: 72 }}>
                    {loggingId === card.routine.id ? '...' : done ? 'Đã xong' : 'Ghi lại'}
                  </button>
                </article>
              )
            })}
          </div>
        </section>

        {growthReminder && (
          <section style={{ background: '#FFF2EC', border: '1px solid #FFE0D2', borderRadius: 22, padding: 16, marginBottom: 20, display: 'flex', gap: 13, alignItems: 'center' }}>
            <div style={{ width: 50, height: 50, borderRadius: 16, background: '#fff', color: '#FF7A59', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Ruler size={26} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 5px', fontSize: 15, fontWeight: 900, color: '#3C2F2A' }}>Đã hơn 30 ngày từ lần cập nhật gần nhất</h2>
              <p style={{ margin: '0 0 10px', fontSize: 12, lineHeight: 1.45, color: '#7B625A' }}>Cập nhật để theo dõi sự phát triển của bé nhé.</p>
              <Link to="/growth" style={{ display: 'inline-flex', borderRadius: 999, background: '#FF5C8A', color: '#fff', padding: '8px 12px', textDecoration: 'none', fontSize: 12, fontWeight: 900 }}>
                Cập nhật ngay
              </Link>
            </div>
          </section>
        )}

        {latestPosts.length > 0 && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#211D23', fontWeight: 900 }}>Khoảnh khắc gần đây</h2>
              <Link to="/feed" style={{ color: '#FF5C8A', textDecoration: 'none', fontSize: 13, fontWeight: 800 }}>Album</Link>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {latestPosts.map((post) => (
                <div key={post.id} style={{ width: 128, height: 128, borderRadius: 18, overflow: 'hidden', background: '#fff', flexShrink: 0 }}>
                  {post.mediaUrl || post.imageUrl ? (
                    <img src={post.mediaUrl || post.imageUrl} alt={post.caption || 'Khoảnh khắc'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#FF5C8A' }}>
                      <Image size={28} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <Navbar />
    </div>
  )
}
