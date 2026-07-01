import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Plus, RefreshCw, Ruler, Scale, X } from 'lucide-react'
import Navbar from '../components/Navbar'
import { growthApi } from '../api/api'

const STATUS_STYLE = {
  NORMAL: { label: 'Bình thường', bg: '#EAF8EF', color: '#1B8A4A' },
  LOW: { label: 'Thấp hơn chuẩn', bg: '#FFF6E5', color: '#B76700' },
  HIGH: { label: 'Cao hơn chuẩn', bg: '#FFF0F3', color: '#C9335C' },
}

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
    return format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: vi })
  } catch {
    return value
  }
}

function StatusBadge({ status }) {
  if (!status) return null
  const style = STATUS_STYLE[status] || { label: status, bg: '#F4F5F7', color: '#60646C' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '4px 10px', background: style.bg, color: style.color, fontSize: 12, fontWeight: 700 }}>
      {style.label}
    </span>
  )
}

function MetricCard({ icon, label, value, unit, status }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 140 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>{label}</p>
          <p style={{ margin: '6px 0 10px', color: 'var(--text-primary)', fontSize: 28, fontWeight: 800 }}>
            {value != null ? Number(value).toFixed(1) : '--'} <span style={{ fontSize: 14, fontWeight: 600 }}>{unit}</span>
          </p>
          <StatusBadge status={status} />
        </div>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--primary-light)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export default function GrowthPage() {
  const user = getUser()
  const canEdit = user.role !== 'VIEWER'
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({ weightKg: '', heightCm: '' })

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3000)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [latestResult, historyResult] = await Promise.allSettled([
        growthApi.latest(),
        growthApi.history(0),
      ])

      setLatest(latestResult.status === 'fulfilled' ? latestResult.value?.data ?? null : null)
      setHistory(historyResult.status === 'fulfilled' ? listFromResponse(historyResult.value) : [])
    } catch {
      showToast('Không thể tải dữ liệu tăng trưởng. Thử lại nhé!', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0))
  }, [history])

  const validate = () => {
    const weight = Number(form.weightKg)
    const height = Number(form.heightCm)
    if (!form.weightKg || Number.isNaN(weight) || weight < 0.5 || weight > 50) {
      showToast('Cân nặng cần nằm trong khoảng 0.5 đến 50 kg.', 'error')
      return false
    }
    if (!form.heightCm || Number.isNaN(height) || height < 30 || height > 200) {
      showToast('Chiều cao cần nằm trong khoảng 30 đến 200 cm.', 'error')
      return false
    }
    return true
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canEdit || !validate()) return
    try {
      setSaving(true)
      await growthApi.record({ weightKg: Number(form.weightKg), heightCm: Number(form.heightCm) })
      setForm({ weightKg: '', heightCm: '' })
      setShowModal(false)
      showToast('Đã lưu chỉ số tăng trưởng.')
      await loadData()
    } catch (error) {
      showToast(error.response?.data?.message || 'Không thể lưu chỉ số. Thử lại nhé!', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container">
      <Navbar />

      {toast && (
        <div className="toast" style={{ background: toast.type === 'error' ? 'var(--danger)' : 'var(--success)' }}>
          {toast.message}
        </div>
      )}

      <main className="content-area" style={{ paddingBottom: 112 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
          <div>
            <h1 className="page-title">Tăng trưởng</h1>
            <p className="page-subtitle">Theo dõi cân nặng, chiều cao và nhận xét theo chuẩn WHO.</p>
          </div>
          <button className="btn-icon" onClick={loadData} aria-label="Tải lại dữ liệu">
            <RefreshCw size={18} />
          </button>
        </div>

        {loading ? (
          <div className="loading-spinner" />
        ) : (
          <>
            {latest ? (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
                <div className="card" style={{ background: 'linear-gradient(135deg, #FFF7FA, #F4F7FF)' }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>Cập nhật gần nhất</p>
                  <h2 style={{ margin: '6px 0 8px', color: 'var(--text-primary)', fontSize: 20 }}>
                    {latest.statusText || 'Đã ghi nhận chỉ số mới'}
                  </h2>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    {latest.suggestion || 'Ba mẹ tiếp tục ghi chỉ số định kỳ để theo dõi xu hướng tăng trưởng của bé.'}
                  </p>
                  <p style={{ margin: '12px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>
                    {formatDate(latest.recordedAt)}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <MetricCard icon={<Scale size={22} />} label="Cân nặng" value={latest.weightKg} unit="kg" status={latest.weightStatus} />
                  <MetricCard icon={<Ruler size={22} />} label="Chiều cao" value={latest.heightCm} unit="cm" status={latest.heightStatus} />
                </div>
              </section>
            ) : (
              <div className="empty-state" style={{ marginBottom: 28 }}>
                <div className="empty-state-emoji">📈</div>
                <p className="empty-state-title">Chưa có dữ liệu tăng trưởng</p>
                <p className="empty-state-desc">Ba mẹ thêm cân nặng và chiều cao để Bediary bắt đầu phân tích cho bé.</p>
              </div>
            )}

            <section>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
                Lịch sử đo ({sortedHistory.length})
              </h2>
              {sortedHistory.length === 0 ? (
                <div className="card" style={{ color: 'var(--text-secondary)' }}>Chưa có lần đo nào.</div>
              ) : (
                <div className="card-list">
                  {sortedHistory.map((item) => (
                    <div key={item.id || item.recordedAt} className="card">
                      <div className="card-row" style={{ alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>{formatDate(item.recordedAt)}</strong>
                          <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>
                            {Number(item.weightKg).toFixed(1)} kg · {Number(item.heightCm).toFixed(1)} cm
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <StatusBadge status={item.weightStatus} />
                          <StatusBadge status={item.heightStatus} />
                        </div>
                      </div>
                      {item.statusText && <p style={{ margin: '10px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>{item.statusText}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {canEdit && (
        <button className="fab" onClick={() => setShowModal(true)} aria-label="Thêm chỉ số tăng trưởng">
          <Plus size={24} />
        </button>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="bottom-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h3 style={{ margin: 0 }}>Thêm chỉ số</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)} aria-label="Đóng">
                <X size={20} />
              </button>
            </div>

            <form className="form-stack" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Cân nặng (kg)</label>
                <input className="form-input" type="number" step="0.1" min="0.5" max="50" value={form.weightKg} onChange={(event) => setForm({ ...form, weightKg: event.target.value })} placeholder="Ví dụ: 7.8" />
              </div>
              <div className="form-group">
                <label className="form-label">Chiều cao (cm)</label>
                <input className="form-input" type="number" step="0.1" min="30" max="200" value={form.heightCm} onChange={(event) => setForm({ ...form, heightCm: event.target.value })} placeholder="Ví dụ: 68.5" />
              </div>
              <button className="btn-primary" type="submit" disabled={saving} style={{ width: '100%' }}>
                {saving ? 'Đang lưu...' : 'Lưu chỉ số'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
