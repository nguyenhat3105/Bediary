import { useState, useEffect } from 'react'
import { Plus, X, CheckCircle2, Trash2, Clock, AlertCircle } from 'lucide-react'
import Navbar from '../components/Navbar'
import { routineApi } from '../api/api'

const EMOJI = { FEED: '🍼', SLEEP: '😴', BATH: '🛁', CUSTOM: '⭐' }

const ACTIVITY_LABELS = {
  FEED: 'An uong',
  SLEEP: 'Ngu',
  BATH: 'Tam',
  CUSTOM: 'Khac',
}

export default function RoutinePage() {
  const user = JSON.parse(localStorage.getItem('bediary_user') || '{}')
  const isAdmin = user.role === 'ADMIN'

  const [routines, setRoutines] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    label: '',
    activityType: 'FEED',
    scheduledTime: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const [loggingId, setLoggingId] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const data = await routineApi.list()
      setRoutines(data)
    } catch {
      showToast('Khong the tai du lieu', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleLog = async (id) => {
    try {
      setLoggingId(id)
      const result = await routineApi.log(id, { note: '' })
      if (result.correctionPrompt) {
        showToast(
          `Lech ${Math.abs(result.deviationMinutes)} phut so voi lich! Hay giu dung gio nhe.`,
          'warning'
        )
      } else {
        showToast('Da ghi nhan hoat dong!')
      }
    } catch {
      showToast('Loi khi ghi nhan', 'error')
    } finally {
      setLoggingId(null)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Xoa hoat dong nay?')) return
    try {
      await routineApi.delete(id)
      showToast('Da xoa!')
      fetchData()
    } catch {
      showToast('Loi khi xoa', 'error')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.label.trim() || !form.scheduledTime) {
      showToast('Vui long dien day du thong tin', 'error')
      return
    }
    try {
      setSubmitting(true)
      await routineApi.create(form)
      showToast('Da them hoat dong moi!')
      setShowModal(false)
      setForm({ label: '', activityType: 'FEED', scheduledTime: '' })
      fetchData()
    } catch {
      showToast('Loi khi them', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const sortedRoutines = [...routines].sort((a, b) =>
    (a.scheduledTime || '').localeCompare(b.scheduledTime || '')
  )

  return (
    <div className="page-container">
      <Navbar />

      {/* Toast */}
      {toast && (
        <div
          className="toast"
          style={{
            background:
              toast.type === 'error'
                ? 'var(--danger)'
                : toast.type === 'warning'
                ? '#f59e0b'
                : 'var(--success)',
          }}
        >
          {toast.type === 'warning' && (
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
          )}
          {toast.msg}
        </div>
      )}

      <div className="content-area" style={{ paddingBottom: '100px' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '24px',
          }}
        >
          <div>
            <h1 className="page-title">Lich sinh hoat ⏰</h1>
            <p className="page-subtitle">Cac hoat dong hang ngay cua be</p>
          </div>
          {isAdmin && (
            <button
              className="btn-primary"
              onClick={() => setShowModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
            >
              <Plus size={16} />
              Them moi
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-spinner" />
        ) : sortedRoutines.length === 0 ? (
          <div className="empty-state">
            <Clock size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>Chua co hoat dong nao</p>
            {isAdmin && (
              <button
                className="btn-primary"
                onClick={() => setShowModal(true)}
                style={{ marginTop: '12px' }}
              >
                Them hoat dong dau tien
              </button>
            )}
          </div>
        ) : (
          <div className="card-list">
            {sortedRoutines.map((routine) => (
              <div
                key={routine.id}
                className="card"
                style={{
                  opacity: routine.isActive === false ? 0.5 : 1,
                  borderLeft: `4px solid var(--primary)`,
                }}
              >
                <div className="card-row">
                  {/* Left: Emoji + Info */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      flex: 1,
                    }}
                  >
                    <span style={{ fontSize: '28px', lineHeight: 1 }}>
                      {EMOJI[routine.activityType] || '⭐'}
                    </span>
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          fontSize: '15px',
                        }}
                      >
                        {routine.label}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {ACTIVITY_LABELS[routine.activityType] || routine.activityType}
                        {routine.scheduledTime && (
                          <>
                            {' '}
                            &bull;{' '}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={11} />
                              {routine.scheduledTime}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="btn-icon btn-success"
                      onClick={() => handleLog(routine.id)}
                      disabled={loggingId === routine.id}
                      title="Ghi nhan"
                    >
                      {loggingId === routine.id ? (
                        <span style={{ fontSize: '12px' }}>...</span>
                      ) : (
                        <CheckCircle2 size={18} />
                      )}
                    </button>
                    {isAdmin && (
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => handleDelete(routine.id)}
                        title="Xoa"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Routine Modal (Admin only) */}
      {isAdmin && showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h3 style={{ margin: 0, fontWeight: 600 }}>Them hoat dong moi</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="form-stack">
              <div className="form-group">
                <label className="form-label">Ten hoat dong *</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Vi du: Bu sang, Ngu trua..."
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Loai hoat dong</label>
                <select
                  className="form-input"
                  value={form.activityType}
                  onChange={(e) => setForm({ ...form, activityType: e.target.value })}
                >
                  <option value="FEED">🍼 An uong</option>
                  <option value="SLEEP">😴 Ngu</option>
                  <option value="BATH">🛁 Tam</option>
                  <option value="CUSTOM">⭐ Khac</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Gio thuc hien *</label>
                <input
                  className="form-input"
                  type="time"
                  value={form.scheduledTime}
                  onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                style={{ width: '100%', marginTop: '8px' }}
              >
                {submitting ? 'Dang luu...' : 'Them hoat dong'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
