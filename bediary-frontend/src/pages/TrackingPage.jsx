import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useRef } from 'react'
import { vi } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, RefreshCw, X } from 'lucide-react'
import { Mic } from 'lucide-react'
import Navbar from '../components/Navbar'
import TimelineFeed from '../components/TimelineFeed'
import { familyApi, trackingApi } from '../api/api'

const ACTIVITIES = [
  { type: 'FEED', emoji: '🍼', label: 'Bú / Ăn', hint: '1 chạm lưu bữa ăn', color: 'var(--c-primary)', bg: 'var(--c-primary-light)' },
  { type: 'SLEEP', emoji: '🌙', label: 'Ngủ', hint: '1 chạm lưu giấc ngủ', color: '#7C3AED', bg: '#F0EBFF' },
  { type: 'PEE', emoji: '💧', label: 'Đi tiểu', hint: '1 chạm lưu tã ướt', color: '#0EA5E9', bg: '#EAF6FF' },
  { type: 'POOP', emoji: '💩', label: 'Đi tiêu', hint: '1 chạm lưu đi tiêu', color: 'var(--c-warning)', bg: 'var(--c-warning-bg)' },
]

function toDatetimeLocal(value, fallbackDate) {
  const date = value ? new Date(value) : fallbackDate
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function datetimeLocalToIso(value) {
  return value ? new Date(value).toISOString() : new Date().toISOString()
}

function normalizeActivityType(log) {
  if (log?.activityType !== 'DIAPER') return log?.activityType || 'FEED'
  return log.metadata?.diaper_type === 'POOP' || log.metadata?.diaper_type === 'BOTH' ? 'POOP' : 'PEE'
}

function getAgeInMonths(dob) {
  if (!dob) return 3
  const birth = new Date(dob)
  const today = new Date()
  if (Number.isNaN(birth.getTime()) || birth > today) return 3
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth()
  if (today.getDate() < birth.getDate()) months -= 1
  return Math.max(0, months)
}

function getDefaultMilkMl(ageMonths) {
  if (ageMonths <= 0) return 60
  if (ageMonths <= 1) return 90
  if (ageMonths <= 2) return 120
  if (ageMonths <= 4) return 150
  if (ageMonths <= 6) return 180
  if (ageMonths <= 9) return 160
  return 140
}

function extractFirstNumber(text) {
  const match = String(text || '').replace(',', '.').match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

function buildVoicePayload(activity, transcript, babyDob) {
  const now = new Date()
  const text = String(transcript || '').trim()
  const lower = text.toLowerCase()
  const number = extractFirstNumber(lower)
  const metadata = {}
  let endTime = null

  if (activity.type === 'FEED') {
    const defaultMl = getDefaultMilkMl(getAgeInMonths(babyDob))
    metadata.value = number || defaultMl
    metadata.unit = 'ml'
    const foodText = lower
      .replace(/\d+(?:[\.,]\d+)?/g, '')
      .replace(/\b(ml|mili|mililit|bú|bu|uống|uong|ăn|an|bé|be)\b/g, '')
      .trim()
    if (foodText) metadata.food = foodText
    metadata.note = text || `Bé bú bình thường khoảng ${metadata.value} ml`
  }

  if (activity.type === 'SLEEP') {
    const duration = number ? Math.round(lower.includes('giờ') || lower.includes('gio') ? number * 60 : number) : 15
    metadata.durationMinutes = duration
    metadata.note = text || `Bé ngủ ${duration} phút`
    endTime = new Date(now.getTime() + duration * 60 * 1000).toISOString()
  }

  if (activity.type === 'PEE') {
    metadata.diaper_type = 'WET'
    metadata.note = text || 'Bé đi tiểu bình thường'
  }

  if (activity.type === 'POOP') {
    metadata.diaper_type = 'POOP'
    metadata.note = text || 'Bé đi tiêu bình thường'
  }

  return { activityType: activity.type, startTime: now.toISOString(), endTime, metadata }
}

function VoiceLogModal({ activity, babyDob, onClose, onSave }) {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const recognitionRef = useRef(null)

  const SpeechRecognition = typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

  useEffect(() => {
    if (!SpeechRecognition) {
      setMessage('Trình duyệt chưa hỗ trợ nhận giọng nói. Ba mẹ có thể nhập nhanh nội dung bên dưới.')
      return undefined
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'vi-VN'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript || '').join(' ')
      setText(transcript.trim())
    }
    recognition.onerror = () => {
      setListening(false)
      setMessage('Chưa nghe rõ. Ba mẹ thử nói lại hoặc nhập tay nhé.')
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)

    return () => recognition.stop()
  }, [SpeechRecognition])

  const toggleListening = () => {
    if (!recognitionRef.current) return
    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      setMessage('')
      recognitionRef.current.start()
      setListening(true)
    }
  }

  const submit = async () => {
    setSaving(true)
    try {
      await onSave(buildVoicePayload(activity, text, babyDob))
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
            <h2 className="text-card-title font-bold">Ghi bằng giọng nói</h2>
            <p className="text-small" style={{ marginTop: 4 }}>{activity.emoji} {activity.label}</p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Đóng"><X size={18} /></button>
        </div>

        <button
          type="button"
          onClick={toggleListening}
          disabled={!recognitionRef.current}
          style={{
            width: 92,
            height: 92,
            borderRadius: '50%',
            border: 'none',
            margin: '6px auto 18px',
            display: 'grid',
            placeItems: 'center',
            background: listening ? 'linear-gradient(135deg,#FF5C8A,#FF8FAB)' : activity.bg,
            color: listening ? '#fff' : activity.color,
            boxShadow: listening ? '0 14px 34px rgba(255,92,138,.35)' : 'none',
          }}
        >
          <Mic size={34} />
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--c-text-hint)', marginBottom: 14 }}>
          {listening ? 'Đang nghe...' : 'Nhấn mic để nói lại. Ví dụ: “Bú 100 ml sữa”, “Ngủ 45 phút”.'}
        </p>
        {message && <div style={{ padding: 12, borderRadius: 14, background: '#FFF7E8', color: '#8A4B00', fontSize: 12, marginBottom: 12 }}>{message}</div>}

        <textarea
          className="input"
          rows={4}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Nội dung giọng nói sẽ hiện ở đây..."
          style={{ height: 'auto', paddingTop: 14, marginBottom: 12 }}
        />

        <button className="btn btn-primary w-full" type="button" onClick={submit} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu nhật ký'}
        </button>
      </div>
    </div>
  )
}

function LogModal({ initialLog, defaultDate, onClose, onSave }) {
  const editing = Boolean(initialLog?.id)
  const initialMeta = initialLog?.metadata || {}
  const [activityType, setActivityType] = useState(normalizeActivityType(initialLog))
  const [startTime, setStartTime] = useState(toDatetimeLocal(initialLog?.startTime, defaultDate))
  const [endTime, setEndTime] = useState(initialLog?.endTime ? toDatetimeLocal(initialLog.endTime, defaultDate) : '')
  const [milkMl, setMilkMl] = useState(initialMeta.value ?? '')
  const [food, setFood] = useState(initialMeta.food ?? '')
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
    if (activityType === 'PEE') metadata.diaper_type = 'WET'
    if (activityType === 'POOP') metadata.diaper_type = 'POOP'
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
  const [babyName, setBabyName] = useState('Bé yêu')
  const [babyDob, setBabyDob] = useState(null)
  const [voiceActivity, setVoiceActivity] = useState(null)
  const longPressTimer = useRef(null)
  const longPressTriggered = useRef(false)
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

  useEffect(() => {
    let mounted = true
    async function loadActiveBaby() {
      try {
        const res = await familyApi.myJournals()
        const journals = Array.isArray(res.data) ? res.data : res.data?.content || []
        const active = journals.find((journal) => journal.active) || journals[0]
        if (mounted) {
          if (active?.babyName) setBabyName(active.babyName)
          if (active?.babyDob) setBabyDob(active.babyDob)
        }
      } catch {
        if (mounted) {
          setBabyName('Bé yêu')
          setBabyDob(null)
        }
      }
    }
    loadActiveBaby()
    return () => { mounted = false }
  }, [])

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
      const now = new Date()
      const metadata = {}
      let endTime = null

      if (activity.type === 'SLEEP') {
        metadata.durationMinutes = 15
        metadata.note = 'Bé ngủ bình thường'
        endTime = new Date(now.getTime() + 15 * 60 * 1000).toISOString()
      }

      if (activity.type === 'FEED') {
        const ageMonths = getAgeInMonths(babyDob)
        metadata.value = getDefaultMilkMl(ageMonths)
        metadata.unit = 'ml'
        metadata.note = `Bé bú bình thường theo mức trung bình khoảng ${metadata.value} ml/lần`
      }

      if (activity.type === 'PEE') {
        metadata.diaper_type = 'WET'
        metadata.note = 'Bé đi tiểu bình thường'
      }

      if (activity.type === 'POOP') {
        metadata.diaper_type = 'POOP'
        metadata.note = 'Bé đi tiêu bình thường'
      }

      await saveLog({ activityType: activity.type, startTime: now.toISOString(), endTime, metadata })
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Ghi thất bại')
    } finally {
      setSavingType(null)
    }
  }

  const startLongPress = (activity) => {
    longPressTriggered.current = false
    window.clearTimeout(longPressTimer.current)
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true
      setVoiceActivity(activity)
    }, 550)
  }

  const endLongPress = () => {
    window.clearTimeout(longPressTimer.current)
  }

  const handleQuickButtonClick = (activity) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false
      return
    }
    quickLog(activity)
  }

  const saveVoiceLog = async (payload) => {
    await trackingApi.log(payload)
    await loadLogs()
    showToast('success', 'Đã lưu nhật ký bằng giọng nói')
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
      {voiceActivity && <VoiceLogModal activity={voiceActivity} babyDob={babyDob} onClose={() => setVoiceActivity(null)} onSave={saveVoiceLog} />}

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {ACTIVITIES.map((activity) => (
                <div key={activity.type} className="card" style={{ padding: 12, background: activity.bg, border: 'none' }}>
                  <button
                    onPointerDown={() => startLongPress(activity)}
                    onPointerUp={endLongPress}
                    onPointerLeave={endLongPress}
                    onPointerCancel={endLongPress}
                    onContextMenu={(event) => event.preventDefault()}
                    onClick={() => handleQuickButtonClick(activity)}
                    disabled={!!savingType}
                    style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', padding: '8px 0', touchAction: 'manipulation' }}
                  >
                    <div style={{ fontSize: 30 }}>{savingType === activity.type ? '...' : activity.emoji}</div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: activity.color }}>{activity.label}</p>
                    <p style={{ fontSize: 11, color: activity.color, opacity: 0.75 }}>{activity.hint}</p>
                    <p style={{ fontSize: 10, color: activity.color, opacity: 0.58, marginTop: 3 }}>Nhấn giữ để nói thêm</p>
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
          <TimelineFeed logs={logs} loading={loading} babyName={babyName} onEdit={(log) => setModalLog(log)} />
        </div>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
