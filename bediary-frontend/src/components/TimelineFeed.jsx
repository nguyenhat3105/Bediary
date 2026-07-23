import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Clock, Pencil, Trash2 } from 'lucide-react'

const ACTIVITY_CONFIG = {
  SLEEP: { icon: '☾', label: 'Ngủ', bg: '#F0EBFF', color: '#7C3AED' },
  FEED: { icon: '◐', label: 'Bú / ăn', bg: 'var(--c-primary-light)', color: 'var(--c-primary)' },
  PEE: { icon: '💧', label: 'Đi tiểu', bg: '#EAF6FF', color: '#0EA5E9' },
  POOP: { icon: '💩', label: 'Đi tiêu', bg: 'var(--c-warning-bg)', color: 'var(--c-warning)' },
  DIAPER: { icon: '◇', label: 'Thay tã', bg: 'var(--c-warning-bg)', color: 'var(--c-warning)' },
}

function isDuplicateOrDefaultNote(type, metadata = {}, note) {
  const normalized = String(note || '').toLowerCase().trim()
  if (!normalized) return true

  const defaultNotes = [
    'bé ngủ bình thường',
    'bé đi tiểu bình thường',
    'bé đi tiêu bình thường',
  ]
  if (defaultNotes.includes(normalized)) return true
  if (normalized.startsWith('bé bú bình thường')) return true

  if (type === 'FEED' && metadata.value !== undefined && metadata.value !== '') {
    const value = String(metadata.value)
    const unit = String(metadata.unit || 'ml').toLowerCase()
    if (normalized === `${value} ${unit}` || normalized === value) return true
    if (normalized === `bú ${value} ${unit}` || normalized === `bu ${value} ${unit}`) return true
  }

  if (type === 'SLEEP' && metadata.durationMinutes) {
    const duration = String(metadata.durationMinutes)
    if (normalized === `${duration} phút` || normalized === `${duration} phut`) return true
    if (normalized === `ngủ ${duration} phút` || normalized === `ngu ${duration} phut`) return true
  }

  return false
}

function formatMetadata(type, metadata = {}) {
  const parts = []
  if (type === 'FEED') {
    if (metadata.value !== undefined && metadata.value !== '') parts.push(`${metadata.value} ${metadata.unit || 'ml'}`)
    if (metadata.food) parts.push(metadata.food)
  }
  if (type === 'SLEEP' && metadata.durationMinutes) parts.push(`${metadata.durationMinutes} phút`)
  if (type === 'PEE') parts.push('Đi tiểu')
  if (type === 'POOP') parts.push('Đi tiêu')
  if (type === 'DIAPER' && metadata.diaper_type) {
    const label = { WET: 'Đi tiểu', POOP: 'Đi tiêu', BOTH: 'Đi tiểu và đi tiêu', DRY: 'Tã khô' }[metadata.diaper_type] || metadata.diaper_type
    parts.push(label)
  }
  if (metadata.note && !isDuplicateOrDefaultNote(type, metadata, metadata.note)) parts.push(metadata.note)
  return parts.length ? parts.join(' · ') : null
}

export default function TimelineFeed({ logs, loading, onEdit, onDelete, babyName }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="activity-row">
            <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="skeleton" style={{ height: 14, borderRadius: 8, width: '40%' }} />
              <div className="skeleton" style={{ height: 12, borderRadius: 8, width: '60%' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '40px 24px' }}>
        <div className="empty-state-emoji">▦</div>
        <p className="empty-state-title" style={{ fontSize: 16 }}>Chưa có hoạt động</p>
        <p className="empty-state-desc">Nhấn nút thêm để ghi lại sinh hoạt của bé.</p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: 22, top: 12, bottom: 12, width: 2, background: 'linear-gradient(to bottom, var(--c-primary-light), transparent)', borderRadius: 2 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {logs.map((log, i) => {
          const cfg = ACTIVITY_CONFIG[log.activityType] || ACTIVITY_CONFIG.SLEEP
          const meta = formatMetadata(log.activityType, log.metadata)
          const time = format(new Date(log.startTime || log.createdAt), 'HH:mm', { locale: vi })
          return (
            <div key={log.id || `${log.activityType}-${i}`} className="flex items-center gap-3 anim-slide" style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both', opacity: 0, paddingLeft: 4 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22, zIndex: 1, fontWeight: 800 }}>
                {cfg.icon}
              </div>
              <div className="activity-row" style={{ flex: 1, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-1)' }}>{cfg.label}</p>
                  <p style={{ fontSize: 12, color: 'var(--c-text-hint)', marginTop: 2, lineHeight: 1.45 }}>
                    {babyName || 'Bé yêu'}
                    {meta && <> · <span style={{ color: cfg.color, fontWeight: 500 }}>{meta}</span></>}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--c-text-hint)', fontSize: 12 }}>
                    <Clock size={12} />
                    <span style={{ fontFamily: 'monospace' }}>{time}</span>
                  </div>
                  {onEdit && (
                    <button type="button" className="btn-icon" onClick={() => onEdit(log)} aria-label="Chỉnh sửa hoạt động" style={{ width: 32, height: 32 }}>
                      <Pencil size={14} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => onDelete(log)}
                      aria-label="Xóa hoạt động"
                      style={{ width: 32, height: 32, color: 'var(--c-error)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
