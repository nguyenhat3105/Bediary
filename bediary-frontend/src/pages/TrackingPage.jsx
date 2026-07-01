import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, RefreshCw, X } from 'lucide-react'
import Navbar from '../components/Navbar'
import TimelineFeed from '../components/TimelineFeed'
import { trackingApi } from '../api/api'

const ACTIVITIES = [
  { type: 'FEED', emoji: '🍼', label: 'Bú / Ăn', hint: '1 chạm lưu bữa ăn', color: 'var(--c-primary)', bg: 'var(--c-primary-light)' },
  { type: 'SLEEP', emoji: '🌙', label: 'Ngủ', hint: '1 chạm lưu giấc ngủ', color: '#7C3AED', bg: '#F0EBFF' },
  { type: 'DIAPER', emoji: '👶', label: 'Thay tã', hint: '1 chạm lưu thay tã', color: 'var(--c-warning)', bg: 'var(--c-warning-bg)' },
]

function toDatetimeLocal(value, fallbackDate) {
  const date = value ? new Date(value) : fallbackDate
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function datetimeLocalToIso(value) {
  return value ? new Date(value).toISOString() : new Date().toISOString()
}

function LogModal({ initialLog, defaultDate, onClose, onSave }) {
  const editing = Boolean(initialLog?.id)
  const initialMeta = initialLog?.metadata || {}
  const [activityType, setActivityType] = useState(initialLog?.activityType || 'FEED')
  const [startTime, setStartTime] = useState(toDatetimeLocal(initialLog?.startTime, defaultDate))
  const [endTime, setEndTime] = useState(initialLog?.endTime ? toDatetimeLocal(initialLog.endTime, defaultDate) : '')
  const [milkMl, setMilkMl] = useState(initialMeta.value ?? '')
  const [food, setFood] = useState(initialMeta.food ?? '')
  const [diaperType, setDiaperType] = useState(initialMeta.diaper_type ?? 'WET')
  const [sleepMinutes, setSleepMinutes] = useState(initialMeta.durationMinutes ?? '')
  const [note, setNote] = useState(initialMeta.note ?? '')
  const [saving, setSaving] = useState(false)

  const activity = ACTIVITIES.find((item) => item.type === activityType) || ACTIVITIES[0]

  const buildPayload = () => {
    const metadata = {}
    if (activityType === 'FEED') {
      if (milkMl !== '') {
        metadata.value = Number(milkMl)
        metadata.unit = 'ml'
      }
      if (food.trim()) metadata.food = food.trim()
    }
    if (activityType === 'SLEEP' && sleepMinutes !== '') metadata.durationMinutes = Number(sleepMinutes)
    if (activityType === 'DIAPER') metadata.diaper_type = diaperType
    if (note.trim()) metadata.note = note.trim()
    return {
      activityType,
      startTime: datetimeLocalToIso(startTime),
      endTime: endTime ? datetimeLocalToIso(endTime) : null,
      metadata,
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave(buildPayload(), initialLog?.id)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-card-title font-bold">{editing ? 'Chỉnh sửa hoạt động' : 'Thêm hoạt động'}</h2>
            <p className="text-small" style={{ marginTop: 4 }}>{activity.emoji} {activity.label}</p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Đóng"><X size={18} /></button>
        </div>

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="input-label">Loại hoạt động</label>
            <select className="input" value={activityType} onChange={(event) => setActivityType(event.target.value)}>
              {ACTIVITIES.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="input-label">Thời gian bắt đầu</label>
            <input className="input" type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
          </div>

          {activityType === 'SLEEP' && (
            <>
              <div className="form-group">
                <label className="input-label">Thời gian kết thúc nếu có</label>
                <input className="input" type="datetime-local" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
              </div>
              <div className="form-group">
                <label className="input-label">Ngủ khoảng bao nhiêu phút?</label>
                <input className="input" type="number" min="0" placeholder="VD: 90" value={sleepMinutes} onChange={(event) => setSleepMinutes(event.target.value)} />
              </div>
            </>
          )}

          {activityType === 'FEED' && (
            <>
              <div className="form-group">
                <label className="input-label">Bú bao nhiêu ml?</label>
                <input className="input" type="number" min="0" placeholder="VD: 120" value={milkMl} onChange={(event) => setMilkMl(event.target.value)} />
              </div>
              <div className="form-group">
                <label className="input-label">Bữa này đã ăn gì?</label>
                <input className="input" placeholder="VD: cháo bí đỏ, chuối nghiền..." value={food} onChange={(event) => setFood(event.target.value)} />
              </div>
            </>
          )}

          {activityType === 'DIAPER' && (
            <div className="form-group">
              <label className="input-label">Loại tã</label>
              <select className="input" value={diaperType} onChange={(event) => setDiaperType(event.target.value)}>
                <option value="WET">Ướt</option>
                <option value="POOP">Đi ngoài</option>
                <option value="BOTH">Cả hai</option>
                <option value="DRY">Khô</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="input-label">Ghi chú thêm</label>
            <textarea className="input" rows={3} style={{ height: 'auto', paddingTop: 14 }} placeholder="VD: bé ăn ngon, hơi quấy, ngủ sâu..." value={note} onChange={(event) => setNote(event.target.value)} />
          </div>

          <button className="btn btn-primary w-full" type="submit" disabled={saving}>{saving ? 'Đang lưu...' : editing ? 'Cập nhật hoạt động' : 'Thêm vào lịch sử'}</button>
        </form>
      </div>
    </div>
  )
}

export default function TrackingPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [toast, setToast] = useState(null)
  const [modalLog, setModalLog] = useState(null)
  const [savingType, setSavingType] = useState(null)
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const displayDate = format(selectedDate, 'EEEE, d MMMM yyyy', { locale: vi })
  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await trackingApi.daily(dateStr)
      setLogs(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Không thể tải lịch sử')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [dateStr])

  useEffect(() => { loadLogs() }, [loadLogs])

  const activityCounts = useMemo(() => logs.reduce((acc, log) => {
    acc[log.activityType] = (acc[log.activityType] || 0) + 1
    return acc
  }, {}), [logs])

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const saveLog = async (payload, id) => {
    if (id) await trackingApi.update(id, payload)
    else await trackingApi.log(payload)
    await loadLogs()
    showToast('success', id ? 'Đã cập nhật hoạt động' : 'Đã thêm hoạt động')
  }

  const quickLog = async (activity) => {
    if (savingType) return
    setSavingType(activity.type)
    try {
      await saveLog({ activityType: activity.type, startTime: new Date().toISOString(), endTime: null, metadata: {} })
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Ghi thất bại')
    } finally {
      setSavingType(null)
    }
  }

  const changeDate = (delta) => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + delta)
    setSelectedDate(next)
  }

  const openCreateModal = () => {
    const d = new Date(selectedDate)
    if (isToday) {
      const now = new Date()
      d.setHours(now.getHours(), now.getMinutes(), 0, 0)
    } else {
      d.setHours(9, 0, 0, 0)
    }
    setModalLog({ startTime: d.toISOString(), activityType: 'FEED', metadata: {} })
  }

  return (
    <div style={{ background: 'var(--c-bg)', minHeight: '100vh' }}>
      <Navbar />
      {toast && <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>{toast.message}</div>}
      {modalLog && <LogModal initialLog={modalLog.id ? modalLog : null} defaultDate={new Date(modalLog.startTime)} onClose={() => setModalLog(null)} onSave={saveLog} />}

      <main className="page-container">
        <div className="anim-fade" style={{ marginBottom: 20 }}>
          <h1 className="text-page-title">Nhật ký</h1>
          <p className="text-desc" style={{ marginTop: 4 }}>Một chạm để lưu nhanh, hoặc bổ sung và chỉnh sửa chi tiết trong lịch sử.</p>
        </div>

        <div className="card flex items-center justify-between" style={{ padding: '12px 16px', marginBottom: 20, borderRadius: 20 }}>
          <button onClick={() => changeDate(-1)} className="btn-icon" style={{ width: 40, height: 40 }}><ChevronLeft size={20} /></button>
          <div className="text-center">
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-text-1)', textTransform: 'capitalize' }}>{displayDate}</p>
            {isToday && <span className="badge badge-pink" style={{ marginTop: 4, fontSize: 11 }}>Hôm nay</span>}
          </div>
          <button onClick={() => changeDate(1)} disabled={isToday} className="btn-icon" style={{ width: 40, height: 40, opacity: isToday ? 0.3 : 1 }}><ChevronRight size={20} /></button>
        </div>

        {loadError && <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--c-error-bg)', color: 'var(--c-error)', fontSize: 13, marginBottom: 16 }}>{loadError}</div>}

        {!loading && logs.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            {ACTIVITIES.map(({ type, label, emoji, bg, color }) => (
              <div key={type} className="card text-center" style={{ padding: '14px 8px', background: bg, border: 'none', boxShadow: 'none' }}>
                <p style={{ fontSize: 26, fontWeight: 700, color }}>{activityCounts[type] || 0}</p>
                <p style={{ fontSize: 12, color, marginTop: 2 }}>{emoji} {label}</p>
              </div>
            ))}
          </div>
        )}

        {isToday && (
          <div style={{ marginBottom: 24 }}>
            <div className="section-header"><span className="section-title" style={{ fontSize: 16 }}>Ghi nhanh</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {ACTIVITIES.map((activity) => (
                <div key={activity.type} className="card" style={{ padding: 12, background: activity.bg, border: 'none' }}>
                  <button onClick={() => quickLog(activity)} disabled={!!savingType} style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', padding: '8px 0' }}>
                    <div style={{ fontSize: 30 }}>{savingType === activity.type ? '...' : activity.emoji}</div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: activity.color }}>{activity.label}</p>
                    <p style={{ fontSize: 11, color: activity.color, opacity: 0.75 }}>{activity.hint}</p>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="section-header">
            <span className="section-title" style={{ fontSize: 16 }}>Lịch sử {logs.length > 0 && <span style={{ color: 'var(--c-primary)' }}>({logs.length})</span>}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={openCreateModal} className="btn btn-primary btn-sm"><Plus size={14} /> Thêm</button>
              <button onClick={loadLogs} className="btn-icon" style={{ width: 36, height: 36 }}><RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /></button>
            </div>
          </div>
          <TimelineFeed logs={logs} loading={loading} onEdit={(log) => setModalLog(log)} />
        </div>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
