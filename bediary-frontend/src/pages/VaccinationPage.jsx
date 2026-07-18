import { useEffect, useMemo, useState } from 'react'
import { format, differenceInCalendarDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Bell, Check, ChevronLeft, Plus, ShieldCheck, Sparkles, Syringe } from 'lucide-react'
import Navbar from '../components/Navbar'
import { dashboardApi, vaccinationApi } from '../api/api'
import { useRole } from '../hooks/useRole'

export const VACCINE_SCHEDULE = [
  { key: 'hep-b-birth', name: 'Viêm gan B', doseNumber: 0, ageLabel: 'Sơ sinh', months: 0, category: 'REQUIRED', notes: 'Tiêm trong 24 giờ đầu sau sinh.' },
  { key: 'bcg-birth', name: 'BCG', doseNumber: 1, ageLabel: 'Sơ sinh', months: 0, category: 'REQUIRED', notes: 'Phòng bệnh lao.' },
  { key: 'rsv-birth', name: 'RSV Beyfortus', doseNumber: 1, ageLabel: '0-6 tháng', months: 0, category: 'OPTIONAL', notes: 'Kháng thể đơn dòng RSV, ưu tiên 6 tháng đầu đời.' },
  { key: 'dpt-hib-polio-hepb-1', name: '6 trong 1 / 5 trong 1', doseNumber: 1, ageLabel: '2 tháng', months: 2, category: 'REQUIRED', notes: 'Bạch hầu, ho gà, uốn ván, bại liệt, Hib, viêm gan B tùy loại.' },
  { key: 'rota-1', name: 'Rotavirus', doseNumber: 1, ageLabel: '2 tháng', months: 2, category: 'OPTIONAL', notes: 'Uống phòng tiêu chảy cấp do Rotavirus.' },
  { key: 'pneumo-1', name: 'Phế cầu', doseNumber: 1, ageLabel: '2 tháng', months: 2, category: 'OPTIONAL', notes: 'Phòng viêm phổi, viêm tai giữa, viêm màng não do phế cầu.' },
  { key: 'mening-acwy-1', name: 'Não mô cầu ACYW-135', doseNumber: 1, ageLabel: '2 tháng', months: 2, category: 'OPTIONAL', notes: 'Nimenrix/MenQuadfi theo tư vấn bác sĩ.' },
  { key: 'mening-b-1', name: 'Não mô cầu B', doseNumber: 1, ageLabel: '2 tháng', months: 2, category: 'OPTIONAL', notes: 'Bexsero mũi 1.' },
  { key: 'dpt-hib-polio-hepb-2', name: '6 trong 1 / 5 trong 1', doseNumber: 2, ageLabel: '3 tháng', months: 3, category: 'REQUIRED', notes: 'Mũi 2.' },
  { key: 'rota-2', name: 'Rotavirus', doseNumber: 2, ageLabel: '3 tháng', months: 3, category: 'OPTIONAL', notes: 'Liều 2.' },
  { key: 'pneumo-2', name: 'Phế cầu', doseNumber: 2, ageLabel: '3 tháng', months: 3, category: 'OPTIONAL', notes: 'Mũi 2.' },
  { key: 'dpt-hib-polio-hepb-3', name: '6 trong 1 / 5 trong 1', doseNumber: 3, ageLabel: '4 tháng', months: 4, category: 'REQUIRED', notes: 'Mũi 3.' },
  { key: 'rota-3', name: 'Rotavirus', doseNumber: 3, ageLabel: '4 tháng', months: 4, category: 'OPTIONAL', notes: 'Liều 3 nếu loại vắc xin cần 3 liều.' },
  { key: 'pneumo-3', name: 'Phế cầu', doseNumber: 3, ageLabel: '4 tháng', months: 4, category: 'OPTIONAL', notes: 'Mũi 3.' },
  { key: 'mening-b-2', name: 'Não mô cầu B', doseNumber: 2, ageLabel: '4 tháng', months: 4, category: 'OPTIONAL', notes: 'Bexsero mũi 2.' },
  { key: 'mening-acwy-2', name: 'Não mô cầu ACYW-135', doseNumber: 2, ageLabel: '4 tháng', months: 4, category: 'OPTIONAL', notes: 'Nimenrix/MenQuadfi mũi 2.' },
  { key: 'flu-1', name: 'Cúm mùa', doseNumber: 1, ageLabel: '6 tháng', months: 6, category: 'OPTIONAL', notes: 'Từ 6 tháng, nhắc hằng năm.' },
  { key: 'mening-bc-1', name: 'Não mô cầu B+C', doseNumber: 1, ageLabel: '6 tháng', months: 6, category: 'OPTIONAL', notes: 'VA-MENGOC-BC nếu chưa tiêm Bexsero.' },
  { key: 'measles-1', name: 'Sởi / MMR sớm', doseNumber: 1, ageLabel: '9 tháng', months: 9, category: 'REQUIRED', notes: 'Sởi đơn hoặc Priorix theo tư vấn.' },
  { key: 'varicella-1', name: 'Thủy đậu', doseNumber: 1, ageLabel: '9-12 tháng', months: 9, category: 'OPTIONAL', notes: 'Tùy loại vắc xin.' },
  { key: 'je-1', name: 'Viêm não Nhật Bản', doseNumber: 1, ageLabel: '9-12 tháng', months: 9, category: 'REQUIRED', notes: 'Imojev hoặc Jevax theo phác đồ.' },
  { key: 'mmr-1', name: 'MMR', doseNumber: 1, ageLabel: '12 tháng', months: 12, category: 'REQUIRED', notes: 'Sởi - Quai bị - Rubella.' },
  { key: 'proquad-1', name: 'MMR + Thủy đậu', doseNumber: 1, ageLabel: '12 tháng', months: 12, category: 'OPTIONAL', notes: 'ProQuad theo tư vấn bác sĩ.' },
  { key: 'hep-a-1', name: 'Viêm gan A', doseNumber: 1, ageLabel: '12 tháng', months: 12, category: 'OPTIONAL', notes: 'Mũi 1, nhắc sau 6-18 tháng.' },
  { key: 'pneumo-4', name: 'Phế cầu', doseNumber: 4, ageLabel: '12 tháng', months: 12, category: 'OPTIONAL', notes: 'Mũi nhắc.' },
  { key: 'mening-b-3', name: 'Não mô cầu B', doseNumber: 3, ageLabel: '12 tháng', months: 12, category: 'OPTIONAL', notes: 'Bexsero mũi 3.' },
  { key: 'dpt-hib-polio-hepb-4', name: '6 trong 1 / 5 trong 1', doseNumber: 4, ageLabel: '15-24 tháng', months: 18, category: 'REQUIRED', notes: 'Mũi nhắc.' },
  { key: 'mmr-2', name: 'MMR', doseNumber: 2, ageLabel: '15-24 tháng', months: 18, category: 'REQUIRED', notes: 'Mũi 2.' },
  { key: 'hep-a-2', name: 'Viêm gan A', doseNumber: 2, ageLabel: '18 tháng', months: 18, category: 'OPTIONAL', notes: 'Mũi 2.' },
  { key: 'flu-yearly', name: 'Cúm mùa', doseNumber: 2, ageLabel: 'Hằng năm', months: 18, category: 'OPTIONAL', notes: 'Tiêm nhắc 1 mũi mỗi năm.' },
  { key: 'je-3', name: 'Viêm não Nhật Bản', doseNumber: 3, ageLabel: '24 tháng', months: 24, category: 'REQUIRED', notes: 'Jevax mũi 3 hoặc Imojev mũi 2 tùy phác đồ.' },
  { key: 'typhoid-1', name: 'Thương hàn', doseNumber: 1, ageLabel: '24 tháng', months: 24, category: 'OPTIONAL', notes: 'Nhắc mỗi 3 năm.' },
  { key: 'cholera-1', name: 'Tả', doseNumber: 1, ageLabel: '24 tháng', months: 24, category: 'OPTIONAL', notes: 'Uống 2 liều cách nhau tối thiểu 2 tuần.' },
  { key: 'dengue-1', name: 'Sốt xuất huyết', doseNumber: 1, ageLabel: '4 tuổi', months: 48, category: 'OPTIONAL', notes: 'Qdenga mũi 1, mũi 2 sau 3 tháng.' },
  { key: 'mmr-3', name: 'MMR / Priorix', doseNumber: 3, ageLabel: '4 tuổi', months: 48, category: 'OPTIONAL', notes: 'Mũi khuyến cáo.' },
  { key: 'je-booster', name: 'Viêm não Nhật Bản', doseNumber: 4, ageLabel: '5 tuổi', months: 60, category: 'REQUIRED', notes: 'Mũi nhắc.' },
]

function getUser() {
  try { return JSON.parse(localStorage.getItem('bediary_user') || '{}') } catch { return {} }
}

function listFromResponse(response) {
  const data = response?.data ?? response
  return Array.isArray(data) ? data : data?.content ?? []
}

function addMonths(date, months) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function toDateInput(date) {
  return format(new Date(date), 'yyyy-MM-dd')
}

function formatDate(value) {
  if (!value) return '--'
  try { return format(new Date(value), 'dd/MM/yyyy', { locale: vi }) } catch { return value }
}

function categoryLabel(category) {
  return category === 'REQUIRED' ? 'Bắt buộc' : 'Không bắt buộc'
}

export default function VaccinationPage() {
  const { canManage } = useRole()
  const [records, setRecords] = useState([])
  const [babyDob, setBabyDob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('schedule')
  const [filter, setFilter] = useState('ALL')
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 2600)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [vaccinationRes, dashboardRes] = await Promise.allSettled([vaccinationApi.list(), dashboardApi.get()])
      if (vaccinationRes.status === 'fulfilled') setRecords(listFromResponse(vaccinationRes.value))
      if (dashboardRes.status === 'fulfilled') setBabyDob(dashboardRes.value.data?.babyDob || null)
    } catch {
      showToast('Không thể tải lịch tiêm.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const recordByKey = useMemo(() => {
    const map = new Map()
    records.forEach((record) => {
      if (record.scheduleKey) map.set(record.scheduleKey, record)
    })
    return map
  }, [records])

  const schedule = useMemo(() => {
    const dob = babyDob ? new Date(babyDob) : new Date()
    return VACCINE_SCHEDULE.map((item) => {
      const record = recordByKey.get(item.key)
      const scheduledDate = record?.scheduledDate || toDateInput(addMonths(dob, item.months))
      const daysLeft = differenceInCalendarDays(new Date(scheduledDate), new Date())
      return { ...item, record, scheduledDate, completedAt: record?.completedAt, daysLeft }
    })
  }, [babyDob, recordByKey])

  const filteredSchedule = useMemo(() => {
    return schedule.filter((item) => filter === 'ALL' || item.category === filter)
  }, [schedule, filter])

  const completed = useMemo(() => schedule.filter((item) => item.completedAt), [schedule])
  const upcoming = useMemo(() => schedule.filter((item) => !item.completedAt && item.daysLeft >= 0).sort((a, b) => a.daysLeft - b.daysLeft)[0], [schedule])

  const createRecord = async (item) => {
    const response = await vaccinationApi.create({
      scheduleKey: item.key,
      vaccineName: item.name,
      doseNumber: item.doseNumber,
      scheduledDate: item.scheduledDate,
      category: item.category,
      ageLabel: item.ageLabel,
      notes: item.notes,
    })
    return response.data
  }

  const ensureRecord = async (item) => item.record || createRecord(item)

  const markComplete = async (item) => {
    if (!canManage) return
    try {
      const record = await ensureRecord(item)
      await vaccinationApi.complete(record.id)
      showToast('Đã đánh dấu đã tiêm.')
      fetchData()
    } catch (err) {
      showToast(err.response?.data?.message || 'Không thể cập nhật mũi tiêm.', 'error')
    }
  }

  const markUncomplete = async (item) => {
    if (!canManage || !item.record) return
    try {
      await vaccinationApi.uncomplete(item.record.id)
      showToast('Đã chuyển về chưa tiêm.')
      fetchData()
    } catch (err) {
      showToast(err.response?.data?.message || 'Không thể cập nhật mũi tiêm.', 'error')
    }
  }

  const remindMe = async (item) => {
    if (!canManage) return
    try {
      await ensureRecord(item)
      showToast(`Đã lưu nhắc hẹn ${formatDate(item.scheduledDate)}.`)
      fetchData()
    } catch (err) {
      showToast(err.response?.data?.message || 'Không thể lưu nhắc hẹn.', 'error')
    }
  }

  const rowStyle = { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #F4E7EC' }

  const renderScheduleItem = (item) => {
    const done = Boolean(item.completedAt)
    return (
      <div key={item.key} style={rowStyle}>
        <div style={{ width: 28, height: 28, borderRadius: 10, display: 'grid', placeItems: 'center', background: done ? '#EAF8EF' : '#FFF8D8', color: done ? '#2A9D59' : '#C9A227', flexShrink: 0 }}>
          {done ? <Check size={17} /> : <Syringe size={16} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 14, color: '#27252A' }}>{item.name}{item.doseNumber > 0 ? ` (Mũi ${item.doseNumber})` : ''}</strong>
            <span style={{ fontSize: 10, fontWeight: 800, color: item.category === 'REQUIRED' ? '#E6456F' : '#6B7280', background: item.category === 'REQUIRED' ? '#FFF0F5' : '#F3F4F6', borderRadius: 999, padding: '3px 7px' }}>{categoryLabel(item.category)}</span>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#7A747D' }}>{item.ageLabel} · Ngày hẹn: {formatDate(item.scheduledDate)}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9A929C', lineHeight: 1.4 }}>{item.notes}</p>
        </div>
        {canManage ? (
          done ? (
            <button onClick={() => markUncomplete(item)} style={{ border: 'none', background: '#EAF8EF', color: '#2A9D59', borderRadius: 999, padding: '8px 10px', fontWeight: 800, fontSize: 12 }}>Đã tiêm</button>
          ) : (
            <button onClick={() => markComplete(item)} style={{ border: '1px solid #FFD0DD', background: '#fff', color: '#FF5C8A', borderRadius: 999, padding: '8px 10px', fontWeight: 800, fontSize: 12 }}>Chưa tiêm</button>
          )
        ) : (
          done
            ? <span style={{ fontSize: 11, color: '#2A9D59', fontWeight: 700 }}>✓ Đã tiêm</span>
            : <span style={{ fontSize: 11, color: '#9CA3AF' }}>Chưa tiêm</span>
        )}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFDFD' }}>
      <Navbar />
      {toast && <div className="toast" style={{ background: toast.type === 'error' ? 'var(--c-error)' : 'var(--c-success)' }}>{toast.message}</div>}

      <main className="page-container" style={{ paddingBottom: 112 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 20 }}>
          <button onClick={() => window.history.back()} className="btn-icon" style={{ position: 'absolute', left: 0, width: 38, height: 38 }} aria-label="Quay lại"><ChevronLeft size={20} /></button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#202027' }}>Tiêm chủng</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#FFF3F6', borderRadius: 22, padding: 4, marginBottom: 18 }}>
          <button onClick={() => setTab('schedule')} style={{ height: 44, border: 'none', borderRadius: 18, background: tab === 'schedule' ? '#fff' : 'transparent', color: tab === 'schedule' ? '#FF5C8A' : '#7D7780', fontWeight: 800, boxShadow: tab === 'schedule' ? '0 8px 18px rgba(255, 92, 138, 0.14)' : 'none' }}>Lịch tiêm</button>
          <button onClick={() => setTab('done')} style={{ height: 44, border: 'none', borderRadius: 18, background: tab === 'done' ? '#fff' : 'transparent', color: tab === 'done' ? '#FF5C8A' : '#7D7780', fontWeight: 800, boxShadow: tab === 'done' ? '0 8px 18px rgba(255, 92, 138, 0.14)' : 'none' }}>Đã tiêm</button>
        </div>

        {/* Info banner for Viewer role */}
        {!canManage && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
            background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
            borderRadius: 14, marginBottom: 16, border: '1px solid #BFDBFE',
          }}>
            <span style={{ fontSize: 18 }}>🔒</span>
            <p style={{ margin: 0, fontSize: 13, color: '#1D4ED8', fontWeight: 500 }}>
              Bạn đang xem với tư cách <strong>Người thân</strong>. Chỉ Ba mẹ mới có thể cập nhật lịch tiêm chủng.
            </p>
          </div>
        )}

        {loading ? <div className="loading-spinner" /> : (
          <>
            {tab === 'schedule' && (
              <>
                <section style={{ borderRadius: 20, padding: 18, marginBottom: 20, background: '#FFF0F4', border: '1px solid #FFE0E8', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ maxWidth: '70%' }}>
                    <h2 style={{ margin: 0, fontSize: 18, color: '#27252A' }}>Sắp tới</h2>
                    {upcoming ? (
                      <>
                        <p style={{ margin: '14px 0 6px', fontWeight: 800, color: '#27252A' }}>{upcoming.name} {upcoming.doseNumber > 0 ? `(Mũi ${upcoming.doseNumber})` : ''}</p>
                        <p style={{ margin: 0, fontSize: 13, color: '#6F6972' }}>Ngày tiêm: <strong>{formatDate(upcoming.scheduledDate)}</strong></p>
                        <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 800, color: upcoming.daysLeft <= 3 ? '#E6456F' : '#6F6972' }}>{upcoming.daysLeft === 0 ? 'Đến lịch hôm nay' : upcoming.daysLeft > 0 ? `Còn ${upcoming.daysLeft} ngày nữa` : 'Đã quá lịch'}</p>
                        <button onClick={() => remindMe(upcoming)} style={{ marginTop: 14, height: 36, border: 'none', borderRadius: 14, padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FF5C8A', color: '#fff', fontWeight: 800, boxShadow: '0 10px 22px rgba(255,92,138,.24)' }}><Plus size={15} /> Nhắc tôi</button>
                      </>
                    ) : <p style={{ margin: '12px 0 0', color: '#6F6972' }}>Không còn mũi tiêm sắp tới trong danh sách.</p>}
                  </div>
                  <div style={{ position: 'absolute', right: 18, top: 34, width: 86, height: 86, borderRadius: 24, background: '#FFDCE7', display: 'grid', placeItems: 'center', color: '#FF5C8A', transform: 'rotate(-8deg)' }}><Syringe size={42} /></div>
                  <Sparkles size={18} style={{ position: 'absolute', right: 104, top: 34, color: '#FF86A8' }} />
                  <ShieldCheck size={28} style={{ position: 'absolute', right: 22, bottom: 24, color: '#FF86A8' }} />
                </section>

                <section>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h2 style={{ margin: 0, fontSize: 18, color: '#27252A' }}>Lịch tiêm theo độ tuổi</h2>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto' }}>
                    {[['ALL', 'Tất cả'], ['REQUIRED', 'Bắt buộc'], ['OPTIONAL', 'Không bắt buộc']].map(([value, label]) => (
                      <button key={value} onClick={() => setFilter(value)} style={{ border: '1px solid #FFE0E8', borderRadius: 999, background: filter === value ? '#FF5C8A' : '#fff', color: filter === value ? '#fff' : '#7A747D', padding: '8px 12px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>{label}</button>
                    ))}
                  </div>
                  <div style={{ border: '1px solid #F3E4EA', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
                    {filteredSchedule.map(renderScheduleItem)}
                  </div>
                </section>
              </>
            )}

            {tab === 'done' && (
              <section>
                <h2 style={{ margin: '0 0 12px', fontSize: 18, color: '#27252A' }}>Đã tiêm ({completed.length})</h2>
                {completed.length ? <div style={{ border: '1px solid #F3E4EA', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>{completed.map(renderScheduleItem)}</div> : <div className="empty-state"><Bell size={38} color="#FF5C8A" /><p className="empty-state-title">Chưa có mũi nào được đánh dấu đã tiêm</p><p className="empty-state-desc">Phụ huynh có thể quay lại tab Lịch tiêm để tích mũi đã hoàn thành.</p></div>}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
