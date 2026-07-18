import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Bath,
  Bell,
  CheckCircle2,
  Clock,
  Edit3,
  Moon,
  Pill,
  Plus,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { routineApi } from '../api/api'
import { useRole } from '../hooks/useRole'

const ACTIVITY_TYPES = [
  { value: 'FEED', label: 'Ăn / bú', hint: 'Bữa ăn, bú mẹ, bú bình', Icon: Utensils, color: '#FF5C8A', bg: '#FFF0F5' },
  { value: 'SLEEP', label: 'Ngủ', hint: 'Giấc ngủ ngày và đêm', Icon: Moon, color: '#7C6DFF', bg: '#F2F0FF' },
  { value: 'BATH', label: 'Tắm', hint: 'Tắm, vệ sinh cơ thể', Icon: Bath, color: '#1D9BF0', bg: '#EAF6FF' },
  { value: 'MEDICINE', label: 'Thuốc / vitamin', hint: 'Thuốc, vitamin, nhỏ mũi', Icon: Pill, color: '#20A06B', bg: '#EAF8EF' },
  { value: 'CUSTOM', label: 'Khác', hint: 'Vận động, chơi, thói quen riêng', Icon: Sparkles, color: '#F59E0B', bg: '#FFF7E8' },
]

const EMPTY_FORM = { label: '', activityType: 'FEED', scheduledTime: '' }

function unwrap(response) {
  return response?.data ?? response
}

function listFromResponse(response) {
  const data = unwrap(response)
  return Array.isArray(data) ? data : data?.content ?? []
}

function typeMeta(type) {
  return ACTIVITY_TYPES.find((item) => item.value === type) || ACTIVITY_TYPES[ACTIVITY_TYPES.length - 1]
}

function normalizeTime(value) {
  return value ? String(value).slice(0, 5) : ''
}

function formatTime(value) {
  return normalizeTime(value) || 'Cả ngày'
}

function minutesFromTime(value) {
  const [hour = 0, minute = 0] = normalizeTime(value).split(':').map(Number)
  return hour * 60 + minute
}

function getTimeStatus(value) {
  if (!value) return { label: 'Chưa đặt giờ', color: '#8A7D88', bg: '#F4F0F3' }
  const now = new Date()
  const current = now.getHours() * 60 + now.getMinutes()
  const diff = minutesFromTime(value) - current
  if (Math.abs(diff) <= 15) return { label: 'Đến giờ', color: '#E6456F', bg: '#FFF0F5' }
  if (diff > 15) return { label: diff >= 60 ? `Còn ${Math.floor(diff / 60)}g ${diff % 60}p` : `Còn ${diff}p`, color: '#20A06B', bg: '#EAF8EF' }
  return { label: 'Đã qua giờ', color: '#8A7D88', bg: '#F4F0F3' }
}

export default function RoutinePage() {
  const { canManage, canLog } = useRole()

  const [routines, setRoutines] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalMode, setModalMode] = useState(null)
  const [editingRoutine, setEditingRoutine] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const [loggingId, setLoggingId] = useState(null)
  const [loggedIds, setLoggedIds] = useState([])
  const [filter, setFilter] = useState('ALL')

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3200)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await routineApi.list()
      setRoutines(listFromResponse(response))
    } catch {
      showToast('Không thể tải lịch sinh hoạt.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const sortedRoutines = useMemo(() => {
    return [...routines]
      .filter((routine) => filter === 'ALL' || routine.activityType === filter)
      .sort((a, b) => normalizeTime(a.scheduledTime).localeCompare(normalizeTime(b.scheduledTime)))
  }, [routines, filter])

  const nextRoutine = useMemo(() => {
    const now = new Date()
    const currentTime = `${now.getHours()}:${now.getMinutes()}`
    return [...routines]
      .filter((routine) => routine.scheduledTime && !loggedIds.includes(routine.id))
      .sort((a, b) => Math.abs(minutesFromTime(a.scheduledTime) - minutesFromTime(currentTime)) - Math.abs(minutesFromTime(b.scheduledTime) - minutesFromTime(currentTime)))[0]
  }, [routines, loggedIds])

  const openCreate = () => {
    setEditingRoutine(null)
    setForm(EMPTY_FORM)
    setModalMode('create')
  }

  const openEdit = (routine) => {
    setEditingRoutine(routine)
    setForm({
      label: routine.label || '',
      activityType: routine.activityType || 'CUSTOM',
      scheduledTime: normalizeTime(routine.scheduledTime),
    })
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingRoutine(null)
    setForm(EMPTY_FORM)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.label.trim() || !form.scheduledTime) {
      showToast('Vui lòng nhập tên hoạt động và giờ thực hiện.', 'error')
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        label: form.label.trim(),
        activityType: form.activityType,
        scheduledTime: form.scheduledTime,
      }
      if (modalMode === 'edit' && editingRoutine) {
        await routineApi.update(editingRoutine.id, payload)
        showToast('Đã cập nhật lịch sinh hoạt.')
      } else {
        await routineApi.create(payload)
        showToast('Đã thêm lịch sinh hoạt mới.')
      }
      closeModal()
      fetchData()
    } catch (error) {
      showToast(error.response?.data?.message || 'Không thể lưu lịch sinh hoạt.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLog = async (routine) => {
    if (!canLog || loggingId === routine.id || loggedIds.includes(routine.id)) return
    try {
      setLoggingId(routine.id)
      const response = await routineApi.log(routine.id, {
        routineId: routine.id,
        executedAt: new Date().toISOString(),
        note: '',
      })
      const result = unwrap(response)
      setLoggedIds((prev) => [...prev, routine.id])
      if (result?.correctionPrompt) {
        showToast(`Lệch ${Math.abs(result.deviationMinutes)} phút so với lịch.`, 'warning')
      } else {
        showToast('Đã ghi nhận hoạt động.')
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Không thể ghi nhận hoạt động.', 'error')
    } finally {
      setLoggingId(null)
    }
  }

  const handleDelete = async (routine) => {
    if (!canManage) return
    if (!window.confirm(`Xóa lịch "${routine.label}"?`)) return
    try {
      await routineApi.delete(routine.id)
      showToast('Đã xóa lịch sinh hoạt.')
      fetchData()
    } catch (error) {
      showToast(error.response?.data?.message || 'Không thể xóa lịch.', 'error')
    }
  }

  const renderRoutine = (routine) => {
    const meta = typeMeta(routine.activityType)
    const Icon = meta.Icon
    const status = getTimeStatus(routine.scheduledTime)
    const isLogged = loggedIds.includes(routine.id) || routine.logged

    return (
      <article key={routine.id} style={{
        background: '#fff',
        border: '1px solid #F4E7EC',
        borderRadius: 18,
        padding: 15,
        boxShadow: '0 10px 24px rgba(31,25,30,0.05)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: meta.bg, color: meta.color, display: 'grid', placeItems: 'center' }}>
            <Icon size={23} />
          </div>

          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: '#252129', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{routine.label}</h3>
            <p style={{ margin: '5px 0 0', display: 'flex', alignItems: 'center', gap: 6, color: '#756F78', fontSize: 12 }}>
              <Clock size={13} />
              {formatTime(routine.scheduledTime)}
              <span style={{ color: '#C4BBC5' }}>·</span>
              {meta.label}
            </p>
          </div>

          <span style={{ borderRadius: 999, background: status.bg, color: status.color, padding: '6px 9px', fontSize: 11, fontWeight: 900, whiteSpace: 'nowrap' }}>
            {status.label}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: canManage ? '1fr 40px 40px' : '1fr', gap: 8, marginTop: 13 }}>
          <button
            onClick={() => handleLog(routine)}
            disabled={!canLog || isLogged || loggingId === routine.id}
            style={{
              height: 40,
              border: isLogged ? '1px solid #CDEED8' : 'none',
              borderRadius: 14,
              background: isLogged ? '#EAF8EF' : '#FF5C8A',
              color: isLogged ? '#2A9D59' : '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              fontWeight: 900,
            }}
          >
            <CheckCircle2 size={17} />
            {loggingId === routine.id ? 'Đang ghi...' : isLogged ? 'Đã ghi nhận' : 'Ghi nhận hôm nay'}
          </button>
          {canManage && (
            <>
              <button className="btn-icon" onClick={() => openEdit(routine)} title="Chỉnh sửa"><Edit3 size={17} /></button>
              <button className="btn-icon" onClick={() => handleDelete(routine)} title="Xóa" style={{ color: '#E54867' }}><Trash2 size={17} /></button>
            </>
          )}
        </div>
      </article>
    )
  }

  return (
    <div className="page-container" style={{ background: '#FFF7F9' }}>
      <Navbar />

      {toast && (
        <div className="toast" style={{ background: toast.type === 'error' ? 'var(--c-error)' : toast.type === 'warning' ? '#F59E0B' : 'var(--c-success)' }}>
          {toast.type === 'warning' && <AlertCircle size={16} style={{ flexShrink: 0 }} />}
          {toast.message}
        </div>
      )}

      <main style={{ padding: '24px 16px 112px' }}>
        <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, color: '#211D23', fontWeight: 900 }}>Lịch sinh hoạt</h1>
            <p style={{ margin: '7px 0 0', fontSize: 14, lineHeight: 1.45, color: '#7E7480' }}>Quản lý giờ ăn, ngủ, tắm và các thói quen hằng ngày của bé.</p>
          </div>
          {canManage && (
            <button className="btn-primary" onClick={openCreate} style={{ height: 42, borderRadius: 14, display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
              <Plus size={16} /> Thêm
            </button>
          )}
        </section>

        <section style={{
          background: 'linear-gradient(135deg, #FF5C8A 0%, #FF8FAB 100%)',
          borderRadius: 24,
          padding: 18,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 18,
          boxShadow: '0 16px 34px rgba(255,92,138,.22)',
        }}>
          <div style={{ width: 54, height: 54, borderRadius: 18, background: 'rgba(255,255,255,.22)', display: 'grid', placeItems: 'center' }}>
            <Bell size={27} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 4px', color: 'rgba(255,255,255,.86)', fontSize: 13 }}>Lịch kế tiếp</p>
            {nextRoutine ? (
              <>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nextRoutine.label}</p>
                <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,.88)', fontSize: 13 }}>{formatTime(nextRoutine.scheduledTime)} · {typeMeta(nextRoutine.activityType).label}</p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Không còn lịch cần ghi nhận hôm nay</p>
            )}
          </div>
        </section>

        <section style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {[{ value: 'ALL', label: 'Tất cả' }, ...ACTIVITY_TYPES].map((item) => (
              <button key={item.value} onClick={() => setFilter(item.value)} style={{
                border: '1px solid #FFE0E8',
                borderRadius: 999,
                background: filter === item.value ? '#FF5C8A' : '#fff',
                color: filter === item.value ? '#fff' : '#756F78',
                padding: '9px 13px',
                fontSize: 12,
                fontWeight: 900,
                whiteSpace: 'nowrap',
              }}>
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          {loading ? (
            <div className="loading-spinner" />
          ) : sortedRoutines.length === 0 ? (
            <div className="card empty-state" style={{ background: '#fff', borderRadius: 22 }}>
              <Clock size={42} color="#FF5C8A" />
              <p className="empty-state-title">Chưa có lịch sinh hoạt</p>
              <p className="empty-state-desc">Tạo các mốc ăn, ngủ, tắm để trang chủ có thông tin hôm nay cho bé.</p>
              {canManage && <button className="btn-primary" onClick={openCreate} style={{ marginTop: 12 }}><Plus size={16} /> Thêm lịch đầu tiên</button>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sortedRoutines.map(renderRoutine)}
            </div>
          )}
        </section>
      </main>

      {canManage && modalMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="bottom-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="bottom-sheet-header">
              <div>
                <h3 style={{ margin: 0, fontWeight: 900 }}>{modalMode === 'edit' ? 'Chỉnh sửa lịch' : 'Thêm lịch sinh hoạt'}</h3>
                <p className="text-hint" style={{ marginTop: 3 }}>Thông tin này sẽ hiển thị ở trang chủ và giúp nhắc hoạt động trong ngày.</p>
              </div>
              <button className="btn-icon" onClick={closeModal} aria-label="Đóng"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="form-stack">
              <div className="form-group">
                <label className="form-label">Tên hoạt động *</label>
                <input className="form-input" type="text" placeholder="Ví dụ: Bú sáng, ngủ trưa, uống vitamin..." value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Loại hoạt động</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {ACTIVITY_TYPES.map(({ value, label, Icon, color, bg }) => {
                    const active = form.activityType === value
                    return (
                      <button key={value} type="button" onClick={() => setForm({ ...form, activityType: value })} style={{
                        border: active ? `2px solid ${color}` : '1px solid #EFE4EA',
                        borderRadius: 14,
                        background: active ? bg : '#fff',
                        padding: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: active ? color : '#403A42',
                        fontWeight: 900,
                        textAlign: 'left',
                      }}>
                        <Icon size={18} /> {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Giờ thực hiện *</label>
                <input className="form-input" type="time" value={form.scheduledTime} onChange={(event) => setForm({ ...form, scheduledTime: event.target.value })} required />
              </div>

              <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', marginTop: 8 }}>
                {submitting ? 'Đang lưu...' : modalMode === 'edit' ? 'Lưu thay đổi' : 'Thêm lịch'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
