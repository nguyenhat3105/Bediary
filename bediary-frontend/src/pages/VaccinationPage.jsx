import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { CheckCircle2, Plus, Syringe, Trash2, X } from 'lucide-react'
import Navbar from '../components/Navbar'
import { vaccinationApi } from '../api/api'

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('bediary_user') || '{}')
  } catch {
    return {}
  }
}

function listFromResponse(response) {
  const data = response?.data ?? response
  return Array.isArray(data) ? data : data?.content ?? []
}

function formatDate(value) {
  if (!value) return '--'
  try {
    return format(new Date(value), 'dd/MM/yyyy', { locale: vi })
  } catch {
    return value
  }
}

export default function VaccinationPage() {
  const user = getUser()
  const canEdit = user.role !== 'VIEWER'
  const [vaccinations, setVaccinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({ vaccineName: '', doseNumber: 1, scheduledDate: '', notes: '' })

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3000)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await vaccinationApi.list()
      setVaccinations(listFromResponse(response))
    } catch {
      showToast('Không thể tải lịch tiêm. Thử lại nhé!', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const upcoming = useMemo(() => vaccinations.filter((v) => !v.completedAt).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)), [vaccinations])
  const completed = useMemo(() => vaccinations.filter((v) => !!v.completedAt).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)), [vaccinations])

  const handleComplete = async (id) => {
    if (!canEdit) return
    try {
      await vaccinationApi.complete(id)
      showToast('Đã đánh dấu hoàn thành.')
      fetchData()
    } catch {
      showToast('Không thể cập nhật mũi tiêm.', 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!canEdit || !window.confirm('Xóa mũi tiêm này?')) return
    try {
      await vaccinationApi.delete(id)
      showToast('Đã xóa mũi tiêm.')
      fetchData()
    } catch {
      showToast('Không thể xóa mũi tiêm.', 'error')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.vaccineName.trim() || !form.scheduledDate) {
      showToast('Vui lòng nhập tên vaccine và ngày tiêm.', 'error')
      return
    }
    try {
      setSubmitting(true)
      await vaccinationApi.create({ ...form, doseNumber: Number(form.doseNumber) || 1 })
      setShowModal(false)
      setForm({ vaccineName: '', doseNumber: 1, scheduledDate: '', notes: '' })
      showToast('Đã thêm mũi tiêm mới.')
      fetchData()
    } catch {
      showToast('Không thể thêm mũi tiêm.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const renderCard = (v, done = false) => (
    <div key={v.id} className="card" style={{ borderLeft: `4px solid ${done ? 'var(--success)' : v.isOverdue ? 'var(--danger)' : 'var(--primary)'}` }}>
      <div className="card-row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {done ? <CheckCircle2 size={18} color="var(--success)" /> : <Syringe size={18} color="var(--primary)" />}
            <strong style={{ color: 'var(--text-primary)', fontSize: 15 }}>{v.vaccineName}</strong>
            {v.isOverdue && !done && <span className="badge" style={{ background: 'var(--danger)', color: '#fff' }}>Trễ hẹn</span>}
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
            Mũi số {v.doseNumber} · {done ? `Hoàn thành ${formatDate(v.completedAt)}` : `Dự kiến ${formatDate(v.scheduledDate)}`}
          </p>
          {v.notes && <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>{v.notes}</p>}
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 8 }}>
            {!done && <button className="btn-icon btn-success" onClick={() => handleComplete(v.id)} title="Đánh dấu hoàn thành"><CheckCircle2 size={18} /></button>}
            <button className="btn-icon btn-danger" onClick={() => handleDelete(v.id)} title="Xóa"><Trash2 size={16} /></button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="page-container">
      <Navbar />
      {toast && <div className="toast" style={{ background: toast.type === 'error' ? 'var(--danger)' : 'var(--success)' }}>{toast.message}</div>}

      <main className="content-area" style={{ paddingBottom: 112 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 className="page-title">Lịch tiêm</h1>
          <p className="page-subtitle">Nhập và theo dõi các mũi tiêm quan trọng của bé.</p>
        </div>

        {loading ? <div className="loading-spinner" /> : (
          <>
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>Sắp tới ({upcoming.length})</h2>
              {upcoming.length ? <div className="card-list">{upcoming.map((v) => renderCard(v))}</div> : <div className="empty-state"><Syringe size={40} style={{ opacity: 0.3, marginBottom: 12 }} /><p>Chưa có lịch tiêm sắp tới.</p></div>}
            </section>

            <section>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>Đã hoàn thành ({completed.length})</h2>
              {completed.length ? <div className="card-list">{completed.map((v) => renderCard(v, true))}</div> : <div className="card" style={{ color: 'var(--text-secondary)' }}>Chưa có mũi tiêm hoàn thành.</div>}
            </section>
          </>
        )}
      </main>

      {canEdit && <button className="fab" onClick={() => setShowModal(true)} aria-label="Thêm mũi tiêm"><Plus size={24} /></button>}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="bottom-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h3 style={{ margin: 0 }}>Thêm mũi tiêm</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)} aria-label="Đóng"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="form-stack">
              <div className="form-group"><label className="form-label">Tên vaccine</label><input className="form-input" value={form.vaccineName} onChange={(event) => setForm({ ...form, vaccineName: event.target.value })} placeholder="Ví dụ: BCG, DPT, MMR" /></div>
              <div className="form-group"><label className="form-label">Số mũi</label><input className="form-input" type="number" min="1" max="10" value={form.doseNumber} onChange={(event) => setForm({ ...form, doseNumber: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Ngày tiêm dự kiến</label><input className="form-input" type="date" value={form.scheduledDate} onChange={(event) => setForm({ ...form, scheduledDate: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Ghi chú</label><textarea className="form-input" rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Địa điểm, phản ứng sau tiêm, dặn dò của bác sĩ..." /></div>
              <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%' }}>{submitting ? 'Đang lưu...' : 'Lưu mũi tiêm'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
