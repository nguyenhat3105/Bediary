import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Apple,
  ArrowDown,
  ArrowUp,
  Banana,
  BarChart2,
  CheckCircle2,
  ChevronRight,
  Drumstick,
  Egg,
  Fish,
  Milk,
  Moon,
  NotebookPen,
  Plus,
  Ruler,
  Salad,
  Scale,
  Soup,
  TrendingUp,
  Utensils,
  X,
  Zap,
} from 'lucide-react'
import { growthApi } from '../api/api'
import Navbar from '../components/Navbar'
import { useRole } from '../hooks/useRole'

const STATUS = {
  NORMAL: { label: 'Bình thường', bg: '#E8F8EF', color: '#18794E', border: '#C3EDD5', Icon: CheckCircle2 },
  UNDERWEIGHT: { label: 'Thiếu cân', bg: '#FFF7E5', color: '#B76700', border: '#FFD9A0', Icon: AlertTriangle },
  SEVERELY_UNDERWEIGHT: { label: 'Suy dinh dưỡng', bg: '#FFF0F0', color: '#C9335C', border: '#FFB3C6', Icon: AlertCircle },
  OVERWEIGHT: { label: 'Thừa cân', bg: '#FFF0F0', color: '#C9335C', border: '#FFB3C6', Icon: AlertTriangle },
  SHORT: { label: 'Chiều cao thấp', bg: '#FFF7E5', color: '#B76700', border: '#FFD9A0', Icon: AlertTriangle },
  TALL: { label: 'Chiều cao cao', bg: '#E8F8EF', color: '#18794E', border: '#C3EDD5', Icon: CheckCircle2 },
}

const FOOD_ICONS = {
  milk: Milk,
  fish: Fish,
  egg: Egg,
  greens: Salad,
  apple: Apple,
  banana: Banana,
  chicken: Drumstick,
  yogurt: Milk,
  beans: Soup,
  plate: Utensils,
  note: NotebookPen,
  sleep: Moon,
}

function statusOf(key) {
  return STATUS[key] || STATUS.NORMAL
}

function fmtDate(value) {
  if (!value) return '--'
  try {
    return format(new Date(value), 'dd/MM/yyyy', { locale: vi })
  } catch {
    return '--'
  }
}

function listFromResponse(response) {
  const data = response?.data ?? response
  return Array.isArray(data) ? data : data?.content ?? []
}

function GrowthChart({ data, tab }) {
  const W = 340
  const H = 150
  const PAD = { top: 20, right: 16, bottom: 36, left: 42 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const points = useMemo(() => {
    const sorted = [...data]
      .filter((item) => (tab === 'weight' ? item.weightKg != null : item.heightCm != null))
      .sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt))
    if (sorted.length < 2) return null

    const values = sorted.map((item) => parseFloat(tab === 'weight' ? item.weightKg : item.heightCm))
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    return sorted.map((item, index) => ({
      x: PAD.left + (index / (sorted.length - 1)) * innerW,
      y: PAD.top + innerH - ((values[index] - min) / range) * innerH,
      date: format(new Date(item.recordedAt), 'dd/MM', { locale: vi }),
      value: values[index],
    }))
  }, [data, tab, innerW, innerH])

  if (!points) {
    return (
      <div style={{ height: 110, display: 'grid', placeItems: 'center', color: 'var(--c-text-hint)', fontSize: 13 }}>
        Cần ít nhất 2 lần đo để hiển thị biểu đồ
      </div>
    )
  }

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L ${points.at(-1).x.toFixed(1)} ${(PAD.top + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id="growth-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF5C8A" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#FF5C8A" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#growth-area)" />
      <path d={line} fill="none" stroke="#FF5C8A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => (
        <g key={index}>
          <circle cx={point.x} cy={point.y} r={index === points.length - 1 ? 6 : 4} fill="#FF5C8A" stroke="#fff" strokeWidth="2" />
          <text x={point.x} y={H - 4} textAnchor="middle" fontSize="9" fill="#BDBDBD">{point.date}</text>
          {index === points.length - 1 && (
            <text x={point.x} y={point.y - 11} textAnchor="middle" fontSize="11" fontWeight="700" fill="#FF5C8A">
              {point.value.toFixed(1)}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

function StatusBlock({ latest }) {
  const weight = statusOf(latest?.weightStatus)
  const height = statusOf(latest?.heightStatus)
  const WeightIcon = weight.Icon
  const HeightIcon = height.Icon

  return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid var(--c-card-border)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 18px', background: '#FFF7FA', borderBottom: '1px solid var(--c-card-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Activity size={18} color="var(--c-primary)" />
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--c-text-1)' }}>Đánh giá theo chuẩn WHO</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ padding: 16, borderRight: '1px solid var(--c-card-border)' }}>
          <p style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--c-text-hint)' }}>
            <Scale size={14} /> Cân nặng
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: weight.bg, color: weight.color, display: 'grid', placeItems: 'center' }}>
              <WeightIcon size={15} />
            </div>
            <strong style={{ fontSize: 13, color: weight.color }}>{weight.label}</strong>
          </div>
          {latest?.weightZScore != null && (
            <p style={{ margin: '8px 0 0', fontSize: 11, color: weight.color }}>
              Z {Number(latest.weightZScore).toFixed(2)} · P{Number(latest.weightPercentile ?? 0).toFixed(1)}
            </p>
          )}
        </div>

        <div style={{ padding: 16 }}>
          <p style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--c-text-hint)' }}>
            <Ruler size={14} /> Chiều cao
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: height.bg, color: height.color, display: 'grid', placeItems: 'center' }}>
              <HeightIcon size={15} />
            </div>
            <strong style={{ fontSize: 13, color: height.color }}>{height.label}</strong>
          </div>
          {latest?.heightZScore != null && (
            <p style={{ margin: '8px 0 0', fontSize: 11, color: height.color }}>
              Z {Number(latest.heightZScore).toFixed(2)} · P{Number(latest.heightPercentile ?? 0).toFixed(1)}
            </p>
          )}
        </div>
      </div>

      {latest?.suggestion && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--c-card-border)', background: '#FAFAFA', display: 'flex', gap: 8 }}>
          <Zap size={14} color="var(--c-primary)" style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: 'var(--c-text-2)' }}>{latest.suggestion}</p>
        </div>
      )}
    </div>
  )
}

export default function GrowthPage() {
  const [tab, setTab] = useState('weight')
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])
  const [nutrition, setNutrition] = useState({ basis: '', items: [] })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showChart, setShowChart] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({ weightKg: '', heightCm: '' })
  const { canManage } = useRole()

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3200)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [latestRes, historyRes, nutritionRes] = await Promise.allSettled([
        growthApi.latest(),
        growthApi.history(0),
        growthApi.nutritionSuggestions(),
      ])

      if (latestRes.status === 'fulfilled' && latestRes.value?.data) setLatest(latestRes.value.data)
      if (historyRes.status === 'fulfilled') setHistory(listFromResponse(historyRes.value))
      if (nutritionRes.status === 'fulfilled' && nutritionRes.value?.data) {
        setNutrition({
          basis: nutritionRes.value.data.basis || '',
          items: Array.isArray(nutritionRes.value.data.items) ? nutritionRes.value.data.items : [],
        })
      }
    } catch {
      showToast('Không thể tải dữ liệu tăng trưởng.', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const sorted = useMemo(() => [...history].sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt)), [history])
  const currentValue = tab === 'weight'
    ? (latest?.weightKg != null ? `${parseFloat(latest.weightKg).toFixed(1)}` : null)
    : (latest?.heightCm != null ? `${parseFloat(latest.heightCm).toFixed(1)}` : null)

  const handleSave = async (event) => {
    event.preventDefault()
    const weight = parseFloat(form.weightKg)
    const height = parseFloat(form.heightCm)
    const hasWeight = !Number.isNaN(weight) && weight >= 0.5 && weight <= 50
    const hasHeight = !Number.isNaN(height) && height >= 30 && height <= 200

    if (!hasWeight && !hasHeight) {
      showToast('Nhập ít nhất một chỉ số hợp lệ.', 'error')
      return
    }

    try {
      setSaving(true)
      await growthApi.record({
        weightKg: hasWeight ? weight : (latest?.weightKg ? parseFloat(latest.weightKg) : null),
        heightCm: hasHeight ? height : (latest?.heightCm ? parseFloat(latest.heightCm) : null),
      })
      setShowModal(false)
      setForm({ weightKg: '', heightCm: '' })
      showToast('Đã lưu chỉ số tăng trưởng.')
      await load()
    } catch (error) {
      showToast(error.response?.data?.message || 'Lưu thất bại.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const historyValue = (item) => {
    if (tab === 'weight') return item.weightKg != null ? `${parseFloat(item.weightKg).toFixed(1)} kg` : '--'
    return item.heightCm != null ? `${parseFloat(item.heightCm).toFixed(1)} cm` : '--'
  }

  return (
    <div style={{ background: '#FFF7F9', minHeight: '100vh' }}>
      <Navbar />

      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}

      <main style={{ maxWidth: 430, margin: '0 auto', padding: '76px 20px 180px' }}>
        <section style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--c-text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={24} color="var(--c-primary)" />
            Theo dõi phát triển
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--c-text-hint)' }}>Chuẩn WHO · 0-60 tháng tuổi</p>
        </section>

        <div style={{ display: 'flex', background: '#EFEFEF', borderRadius: 999, padding: 4, marginBottom: 24, gap: 4 }}>
          {[
            { key: 'weight', label: 'Cân nặng', Icon: Scale },
            { key: 'height', label: 'Chiều cao', Icon: Ruler },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setShowChart(false) }}
              style={{
                flex: 1,
                height: 42,
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: tab === key ? '#fff' : 'transparent',
                color: tab === key ? 'var(--c-primary)' : 'var(--c-text-hint)',
                fontWeight: 800,
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[180, 100, 130, 110].map((height, index) => (
              <div key={index} className="skeleton" style={{ height, borderRadius: 20 }} />
            ))}
          </div>
        ) : (
          <>
            <section style={{
              background: 'linear-gradient(135deg, #FFF0F5 0%, #fff 60%)',
              borderRadius: 24,
              padding: '22px 20px 20px',
              border: '1px solid #FFE0EB',
              boxShadow: '0 4px 20px rgba(255,92,138,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 16,
            }}>
              <div>
                <p style={{ margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--c-text-hint)', fontWeight: 700 }}>
                  {tab === 'weight' ? <Scale size={15} /> : <Ruler size={15} />}
                  {tab === 'weight' ? 'Cân nặng hiện tại' : 'Chiều cao hiện tại'}
                </p>
                {currentValue ? (
                  <>
                    <p style={{ margin: 0, fontSize: 52, fontWeight: 900, lineHeight: 1, color: 'var(--c-text-1)' }}>
                      {currentValue}
                      <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-text-2)', marginLeft: 4 }}>{tab === 'weight' ? 'kg' : 'cm'}</span>
                    </p>
                    <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--c-text-hint)' }}>Ngày {fmtDate(latest?.recordedAt)}</p>
                  </>
                ) : (
                  <p style={{ fontSize: 15, color: 'var(--c-text-hint)' }}>Chưa có dữ liệu</p>
                )}
              </div>
              <span style={{ fontSize: 62, lineHeight: 1 }}>{tab === 'weight' ? '⚖️' : '📏'}</span>
            </section>

            {latest && <StatusBlock latest={latest} />}

            <section style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--c-text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BarChart2 size={16} color="var(--c-primary)" />
                  Biểu đồ tăng trưởng
                </h2>
                <button onClick={() => setShowChart((value) => !value)} style={{ border: 'none', borderRadius: 999, padding: '6px 12px', color: 'var(--c-primary)', background: 'var(--c-primary-light)', fontWeight: 800 }}>
                  {showChart ? 'Ẩn' : 'Xem biểu đồ'}
                </button>
              </div>
              {showChart && (
                <div style={{ background: '#fff', borderRadius: 20, padding: '16px 12px 8px', border: '1px solid var(--c-card-border)' }}>
                  <GrowthChart data={history} tab={tab} />
                  <p style={{ textAlign: 'center', fontSize: 10, color: 'var(--c-text-hint)', marginTop: 4 }}>Đơn vị: {tab === 'weight' ? 'kg' : 'cm'} · Cũ đến mới</p>
                </div>
              )}
            </section>

            <section style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--c-text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Utensils size={17} color="var(--c-primary)" />
                  Gợi ý dinh dưỡng
                </h2>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-primary)', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 2 }}>
                  Xem thêm <ChevronRight size={13} />
                </button>
              </div>

              {nutrition.basis && (
                <p style={{ margin: '-4px 0 12px', fontSize: 12, lineHeight: 1.5, color: 'var(--c-text-hint)' }}>{nutrition.basis}</p>
              )}

              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                {nutrition.items.map((item) => {
                  const FoodIcon = FOOD_ICONS[item.iconKey] || Utensils
                  const high = item.priority === 'HIGH'
                  return (
                    <div key={`${item.iconKey}-${item.name}`} style={{
                      minWidth: 170,
                      maxWidth: 190,
                      flexShrink: 0,
                      background: '#fff',
                      borderRadius: 16,
                      padding: 14,
                      border: high ? '1px solid #FFB3C6' : '1px solid var(--c-card-border)',
                      boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 13, display: 'grid', placeItems: 'center', background: high ? '#FFF0F5' : '#F6F7FB', color: high ? 'var(--c-primary)' : '#687088' }}>
                          <FoodIcon size={22} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'var(--c-text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 800, color: high ? 'var(--c-primary)' : 'var(--c-text-hint)' }}>{item.category}</p>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, lineHeight: 1.45, color: 'var(--c-text-2)' }}>{item.reason}</p>
                      <p style={{ margin: '7px 0 0', fontSize: 10.5, lineHeight: 1.4, color: 'var(--c-text-hint)' }}>{item.servingNote}</p>
                    </div>
                  )
                })}
              </div>
            </section>

            <section>
              <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: 'var(--c-text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={16} color="var(--c-primary)" />
                Lịch sử {tab === 'weight' ? 'cân nặng' : 'chiều cao'}
              </h2>

              {sorted.length === 0 ? (
                <div className="empty-state" style={{ padding: '28px 0' }}>
                  <div className="empty-state-emoji">📊</div>
                  <p className="empty-state-title">Chưa có dữ liệu</p>
                  <p className="empty-state-desc">Nhấn nút bên dưới để cập nhật chỉ số đầu tiên.</p>
                </div>
              ) : (
                <div style={{ background: '#fff', borderRadius: 20, border: '1px solid var(--c-card-border)', overflow: 'hidden' }}>
                  {sorted.slice(0, 8).map((item, index) => {
                    const info = statusOf(tab === 'weight' ? item.weightStatus : item.heightStatus)
                    const Icon = info.Icon
                    return (
                      <div key={item.id || index} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: index < Math.min(sorted.length, 8) - 1 ? '1px solid var(--c-card-border)' : 'none' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: info.bg, color: info.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          <Icon size={16} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--c-text-2)' }}>{fmtDate(item.recordedAt)}</p>
                          <span style={{ fontSize: 11, color: info.color, fontWeight: 800 }}>{info.label}</span>
                        </div>
                        <strong style={{ fontSize: 16, color: 'var(--c-text-1)' }}>{historyValue(item)}</strong>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 390, zIndex: 40 }}>
        {canManage ? (
          <button onClick={() => setShowModal(true)} className="btn btn-primary w-full" style={{ height: 54, fontSize: 15, borderRadius: 999, boxShadow: '0 6px 24px rgba(255,92,138,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Plus size={20} />
            Cập nhật {tab === 'weight' ? 'cân nặng' : 'chiều cao'}
          </button>
        ) : (
          <div style={{
            background: '#fff', border: '1.5px solid #FFD6E4',
            borderRadius: 20, padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 4px 16px rgba(255,92,138,0.1)',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: '#FFF0F5', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 18 }}>🔒</span>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#C9335C', margin: 0 }}>
                Chỉ ba/mẹ có thể ghi số đo
              </p>
              <p style={{ fontSize: 11, color: '#AAAAAA', margin: '2px 0 0' }}>
                Bạn đang xem dữ liệu tăng trưởng của bé
              </p>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && setShowModal(false)}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--c-text-1)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                {tab === 'weight' ? <Scale size={18} color="var(--c-primary)" /> : <Ruler size={18} color="var(--c-primary)" />}
                Cập nhật {tab === 'weight' ? 'cân nặng' : 'chiều cao'}
              </h3>
              <button onClick={() => setShowModal(false)} className="btn-icon" style={{ width: 34, height: 34 }}><X size={17} /></button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="input-label">{tab === 'weight' ? 'Cân nặng (kg)' : 'Chiều cao (cm)'} *</label>
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  min={tab === 'weight' ? '0.5' : '30'}
                  max={tab === 'weight' ? '50' : '200'}
                  value={tab === 'weight' ? form.weightKg : form.heightCm}
                  onChange={(event) => setForm(tab === 'weight' ? { ...form, weightKg: event.target.value } : { ...form, heightCm: event.target.value })}
                  placeholder={tab === 'weight' ? 'Ví dụ: 9.4' : 'Ví dụ: 74.5'}
                  autoFocus
                />
              </div>

              <div style={{ background: 'var(--c-surface)', borderRadius: 12, padding: '12px 14px', marginBottom: 18 }}>
                <p style={{ fontSize: 11, color: 'var(--c-text-hint)', margin: '0 0 10px', fontStyle: 'italic' }}>Tùy chọn, bổ sung thêm:</p>
                <label className="input-label">{tab === 'weight' ? 'Chiều cao (cm)' : 'Cân nặng (kg)'}</label>
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  min={tab === 'weight' ? '30' : '0.5'}
                  max={tab === 'weight' ? '200' : '50'}
                  value={tab === 'weight' ? form.heightCm : form.weightKg}
                  onChange={(event) => setForm(tab === 'weight' ? { ...form, heightCm: event.target.value } : { ...form, weightKg: event.target.value })}
                  placeholder={tab === 'weight' ? 'Ví dụ: 74.5' : 'Ví dụ: 9.4'}
                  style={{ background: '#fff' }}
                />
              </div>

              <div style={{ background: '#FFF0F5', borderRadius: 12, padding: '10px 14px', marginBottom: 18, display: 'flex', gap: 8, alignItems: 'center' }}>
                <TrendingUp size={13} color="var(--c-primary)" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 11, color: 'var(--c-primary)', margin: 0, lineHeight: 1.5 }}>
                  Bediary tự động phân tích theo chuẩn WHO đối với tuổi và giới tính của bé.
                </p>
              </div>

              <button type="submit" disabled={saving} className="btn btn-primary w-full" style={{ height: 50 }}>
                {saving ? 'Đang lưu...' : 'Lưu chỉ số'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
