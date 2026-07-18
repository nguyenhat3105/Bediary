import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  ClipboardPlus,
  Dna,
  Edit3,
  FileText,
  HeartPulse,
  Loader2,
  Pill,
  Plus,
  Save,
  ScanSearch,
  ShieldAlert,
  Stethoscope,
  Trash2,
  UploadCloud,
  X,
  ChevronRight,
  Activity,
  Clock,
  Sparkles,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { healthApi } from '../api/api'

const TYPES = [
  { value: '', label: 'Tất cả', Icon: HeartPulse, color: '#FF5C8A', bg: '#FFF0F5', gradient: 'linear-gradient(135deg,#FF5C8A,#FF8FAB)' },
  { value: 'CHECKUP', label: 'Lần khám', Icon: Stethoscope, color: '#4A6CF7', bg: '#EEF3FF', gradient: 'linear-gradient(135deg,#4A6CF7,#7B9FF9)' },
  { value: 'CONDITION', label: 'Bệnh lý', Icon: ShieldAlert, color: '#F97316', bg: '#FFF4E8', gradient: 'linear-gradient(135deg,#F97316,#FBAB60)' },
  { value: 'HEREDITARY', label: 'Di truyền', Icon: Dna, color: '#7C3AED', bg: '#F4EEFF', gradient: 'linear-gradient(135deg,#7C3AED,#A78BFA)' },
  { value: 'MEDICATION', label: 'Thuốc', Icon: Pill, color: '#16A34A', bg: '#EAF8EF', gradient: 'linear-gradient(135deg,#16A34A,#4ADE80)' },
  { value: 'ALLERGY', label: 'Dị ứng', Icon: AlertTriangle, color: '#DC2626', bg: '#FFF0F0', gradient: 'linear-gradient(135deg,#DC2626,#F87171)' },
  { value: 'NOTE', label: 'Ghi chú', Icon: FileText, color: '#64748B', bg: '#F3F6F8', gradient: 'linear-gradient(135deg,#64748B,#94A3B8)' },
]

const EMPTY_FORM = {
  recordType: 'CHECKUP',
  title: '',
  eventDate: new Date().toISOString().slice(0, 10),
  nextFollowUpDate: '',
  facility: '',
  doctorName: '',
  diagnosis: '',
  medicationName: '',
  medicationDosage: '',
  medicationStatus: 'ACTIVE',
  hereditarySide: 'UNKNOWN',
  severity: 'LOW',
  notes: '',
}

function unwrap(response) { return response?.data ?? response }
function listFromResponse(response) {
  const data = unwrap(response)
  return Array.isArray(data) ? data : data?.content ?? []
}
function typeMeta(type) { return TYPES.find((t) => t.value === type) || TYPES[0] }
function formatDate(value) {
  if (!value) return 'Chưa có ngày'
  return new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function daysUntil(value) {
  if (!value) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const date = new Date(value); date.setHours(0, 0, 0, 0)
  return Math.round((date - today) / 86400000)
}
function compactPayload(form) {
  return Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]))
}
function normalizeDraft(record) {
  return {
    ...EMPTY_FORM, ...record,
    eventDate: record?.eventDate || '',
    nextFollowUpDate: record?.nextFollowUpDate || '',
    medicationStatus: record?.medicationStatus || 'ACTIVE',
    hereditarySide: record?.hereditarySide || 'UNKNOWN',
    severity: record?.severity || 'LOW',
  }
}

export default function HealthRecordPage() {
  const [filter, setFilter] = useState('')
  const [records, setRecords] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importFileName, setImportFileName] = useState('')
  const [importText, setImportText] = useState('')
  const [importWarnings, setImportWarnings] = useState([])
  const [drafts, setDrafts] = useState([])
  const [selectedDrafts, setSelectedDrafts] = useState({})
  const fileRef = useRef(null)

  useEffect(() => { loadRecords() }, [filter])

  async function loadRecords() {
    setLoading(true); setError('')
    try {
      const [recordsRes, upcomingRes] = await Promise.allSettled([
        healthApi.list(filter || undefined),
        healthApi.upcoming(90),
      ])
      if (recordsRes.status === 'fulfilled') setRecords(listFromResponse(recordsRes.value))
      if (upcomingRes.status === 'fulfilled') setUpcoming(listFromResponse(upcomingRes.value))
    } catch { setError('Không thể tải sổ sức khỏe. Thử lại nhé.') }
    finally { setLoading(false) }
  }

  function openCreate(type = 'CHECKUP') {
    setEditingId(null); setForm({ ...EMPTY_FORM, recordType: type || 'CHECKUP' }); setModalOpen(true)
  }
  function openEdit(record) {
    setEditingId(record.id); setForm(normalizeDraft(record)); setModalOpen(true)
  }
  async function submitForm(e) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Vui lòng nhập tiêu đề hồ sơ.'); return }
    setSaving(true); setError('')
    try {
      const payload = compactPayload({ ...form, title: form.title.trim() })
      if (editingId) await healthApi.update(editingId, payload)
      else await healthApi.create(payload)
      setModalOpen(false); await loadRecords()
    } catch (err) { setError(err.response?.data?.message || 'Không thể lưu hồ sơ sức khỏe.') }
    finally { setSaving(false) }
  }
  async function deleteRecord(record) {
    if (!window.confirm(`Xóa hồ sơ "${record.title}"?`)) return
    setError('')
    try { await healthApi.delete(record.id); await loadRecords() }
    catch (err) { setError(err.response?.data?.message || 'Không thể xóa hồ sơ này.') }
  }
  function openImport() {
    setImportOpen(true); setImportFileName(''); setImportText(''); setImportWarnings([]); setDrafts([]); setSelectedDrafts({})
  }
  async function analyzeFile(e) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('File tối đa 10MB.'); return }
    setImporting(true); setImportFileName(file.name); setImportText(''); setImportWarnings([]); setDrafts([]); setSelectedDrafts({})
    try {
      const res = await healthApi.analyzeImport(file)
      const data = unwrap(res)
      const nextDrafts = (data.records || []).map(normalizeDraft)
      setDrafts(nextDrafts)
      setSelectedDrafts(Object.fromEntries(nextDrafts.map((_, i) => [i, true])))
      setImportText(data.extractedText || ''); setImportWarnings(data.warnings || [])
    } catch (err) {
      setImportWarnings([err.response?.data?.message || 'Không thể đọc tài liệu. Hãy thử ảnh rõ hơn hoặc nhập tay.'])
    } finally { setImporting(false) }
  }
  function updateDraft(index, patch) {
    setDrafts((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item))
  }
  async function saveSelectedDrafts() {
    const selected = drafts.filter((_, i) => selectedDrafts[i])
    if (selected.length === 0) { setImportWarnings(['Vui lòng chọn ít nhất một hồ sơ để lưu.']); return }
    setSaving(true); setError('')
    try {
      for (const draft of selected) {
        if (!draft.title?.trim()) throw new Error('Một hồ sơ đang thiếu tiêu đề.')
        await healthApi.create(compactPayload({ ...draft, title: draft.title.trim() }))
      }
      setImportOpen(false); await loadRecords()
    } catch (err) { setImportWarnings([err.response?.data?.message || err.message || 'Không thể lưu bản nháp đã chọn.']) }
    finally { setSaving(false) }
  }

  const stats = useMemo(() => ({
    activeMeds: records.filter((r) => r.recordType === 'MEDICATION' && r.medicationStatus === 'ACTIVE').length,
    conditions: records.filter((r) => r.recordType === 'CONDITION').length,
    allergies: records.filter((r) => r.recordType === 'ALLERGY').length,
    total: records.length,
  }), [records])

  const nextAppointment = upcoming[0]

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #FFF4F8 0%, #FFFBFC 100%)' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes slideUp { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
        .slide-up { animation: slideUp 0.3s ease; }
        .pill-btn { transition: all 0.18s; }
        .pill-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .record-card { transition: all 0.2s; }
        .record-card:hover { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(35,28,34,.1) !important; }
        .action-btn { transition: all 0.18s; }
        .action-btn:hover { transform: translateY(-2px); }
        .icon-btn { transition: all 0.15s; }
        .icon-btn:hover { background: #F5E8EE !important; }
      `}</style>

      <main style={{ padding: '88px 16px 120px', maxWidth: 520, margin: '0 auto' }}>

        {/* ── Hero Banner ── */}
        <section style={{
          borderRadius: 32, padding: '24px 22px 22px',
          background: 'linear-gradient(145deg, #FF5C8A 0%, #E91E8C 60%, #C2185B 100%)',
          color: '#fff', boxShadow: '0 20px 50px rgba(255,92,138,.30)',
          marginBottom: 18, position: 'relative', overflow: 'hidden',
        }}>
          {/* decorative circles */}
          <div style={{ position:'absolute', top:-30, right:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.08)' }} />
          <div style={{ position:'absolute', bottom:-40, right:30, width:90, height:90, borderRadius:'50%', background:'rgba(255,255,255,.05)' }} />

          <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:14 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                <div style={{ width:28, height:28, borderRadius:9, background:'rgba(255,255,255,.2)', display:'grid', placeItems:'center' }}>
                  <HeartPulse size={15} />
                </div>
                <span style={{ fontSize:12, fontWeight:800, opacity:.9, letterSpacing:.5 }}>SỔ SỨC KHỎE GIA ĐÌNH</span>
              </div>
              <h1 style={{ margin:'0 0 8px', fontSize:27, fontWeight:900, lineHeight:1.1, letterSpacing:-.3 }}>
                Sức khỏe của bé
              </h1>
              <p style={{ margin:0, fontSize:13, lineHeight:1.55, opacity:.88, maxWidth:240 }}>
                Lưu lịch khám, đơn thuốc, dị ứng và lời dặn của bác sĩ. AI hỗ trợ điền từ giấy khám.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openCreate('CHECKUP')}
              aria-label="Thêm hồ sơ"
              style={{
                width:48, height:48, borderRadius:17, flexShrink:0,
                border:'1.5px solid rgba(255,255,255,.5)',
                background:'rgba(255,255,255,.22)',
                color:'#fff', display:'grid', placeItems:'center',
                backdropFilter:'blur(8px)', transition:'all .18s',
              }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.35)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,.22)'}
            >
              <Plus size={22} />
            </button>
          </div>
        </section>

        {/* ── Quick Actions ── */}
        <section style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          <button type="button" className="action-btn" onClick={openImport} style={{
            borderRadius:22, border:'1.5px solid #FFD6E4',
            background:'linear-gradient(135deg,#FFF0F5,#FFF8FA)',
            color:'#FF5C8A', display:'flex', alignItems:'center', gap:10,
            textAlign:'left', fontFamily:'inherit', padding:'14px 14px',
            boxShadow:'0 4px 16px rgba(255,92,138,.08)',
          }}>
            <div style={{ width:40, height:40, borderRadius:14, background:'linear-gradient(135deg,#FF5C8A,#FF8FAB)', display:'grid', placeItems:'center', flexShrink:0, boxShadow:'0 6px 14px rgba(255,92,138,.3)' }}>
              <ScanSearch size={20} color="#fff" />
            </div>
            <span style={{ lineHeight:1.35 }}>
              <strong style={{ display:'block', fontSize:13, fontWeight:900, color:'#28232A' }}>Import giấy khám</strong>
              <small style={{ fontSize:11, color:'#8D848E', fontWeight:600 }}>AI bóc tách nhanh</small>
            </span>
          </button>

          <button type="button" className="action-btn" onClick={() => openCreate('MEDICATION')} style={{
            borderRadius:22, border:'1.5px solid #BBF7D0',
            background:'linear-gradient(135deg,#ECFDF5,#F0FFF4)',
            color:'#16A34A', display:'flex', alignItems:'center', gap:10,
            textAlign:'left', fontFamily:'inherit', padding:'14px 14px',
            boxShadow:'0 4px 16px rgba(22,163,74,.06)',
          }}>
            <div style={{ width:40, height:40, borderRadius:14, background:'linear-gradient(135deg,#16A34A,#4ADE80)', display:'grid', placeItems:'center', flexShrink:0, boxShadow:'0 6px 14px rgba(22,163,74,.28)' }}>
              <Pill size={20} color="#fff" />
            </div>
            <span style={{ lineHeight:1.35 }}>
              <strong style={{ display:'block', fontSize:13, fontWeight:900, color:'#28232A' }}>Thêm thuốc</strong>
              <small style={{ fontSize:11, color:'#8D848E', fontWeight:600 }}>Nhập tay khi cần</small>
            </span>
          </button>
        </section>

        {/* ── Stats Grid ── */}
        <section style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
          {[
            { Icon: Activity, color:'#FF5C8A', bg:'#FFF0F5', label:'Hồ sơ', value: stats.total },
            { Icon: Pill, color:'#16A34A', bg:'#EAF8EF', label:'Đang dùng thuốc', value: stats.activeMeds },
            { Icon: AlertTriangle, color:'#DC2626', bg:'#FFF0F0', label:'Dị ứng', value: stats.allergies },
            { Icon: ShieldAlert, color:'#F97316', bg:'#FFF4E8', label:'Bệnh lý', value: stats.conditions },
          ].map(({ Icon, color, bg, label, value }) => (
            <div key={label} style={{
              borderRadius:18, background:'#fff', padding:'12px 10px 10px',
              border:'1px solid #F3E2E8', textAlign:'center',
              boxShadow:'0 4px 14px rgba(35,28,34,.04)',
            }}>
              <div style={{ width:32, height:32, borderRadius:11, background:bg, display:'grid', placeItems:'center', margin:'0 auto 6px' }}>
                <Icon size={16} color={color} />
              </div>
              <strong style={{ display:'block', fontSize:20, fontWeight:900, color:'#28232A', lineHeight:1 }}>{value}</strong>
              <p style={{ margin:'4px 0 0', fontSize:10, color:'#9C8EA0', fontWeight:700, lineHeight:1.2 }}>{label}</p>
            </div>
          ))}
        </section>

        {/* ── Next Appointment Banner ── */}
        {nextAppointment && (() => {
          const due = daysUntil(nextAppointment.nextFollowUpDate)
          const overdue = due !== null && due < 0
          return (
            <section style={{
              borderRadius:22, padding:'14px 16px',
              background: overdue ? 'linear-gradient(135deg,#FEF2F2,#FFF5F5)' : 'linear-gradient(135deg,#EFF6FF,#F0F9FF)',
              border: `1.5px solid ${overdue ? '#FCA5A5' : '#BAE6FD'}`,
              marginBottom:16, display:'flex', alignItems:'center', gap:12,
            }}>
              <div style={{ width:42, height:42, borderRadius:14, background: overdue ? '#DC2626' : '#0EA5E9', display:'grid', placeItems:'center', flexShrink:0, boxShadow: `0 6px 16px ${overdue ? 'rgba(220,38,38,.25)' : 'rgba(14,165,233,.25)'}` }}>
                <CalendarPlus size={20} color="#fff" />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontSize:11, fontWeight:800, color: overdue ? '#DC2626' : '#0EA5E9', letterSpacing:.3 }}>
                  {overdue ? `⚠️ QUÁ HẠN ${Math.abs(due)} NGÀY` : due === 0 ? '📅 HÔM NAY TÁI KHÁM' : `📅 CÒN ${due} NGÀY`}
                </p>
                <p style={{ margin:'3px 0 0', fontSize:14, fontWeight:800, color:'#1E293B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {nextAppointment.title}
                </p>
                <p style={{ margin:'2px 0 0', fontSize:12, color:'#64748B', fontWeight:600 }}>
                  {formatDate(nextAppointment.nextFollowUpDate)}
                  {nextAppointment.facility ? ` · ${nextAppointment.facility}` : ''}
                </p>
              </div>
              <ChevronRight size={16} color="#94A3B8" />
            </section>
          )
        })()}

        {/* ── Type Filter Pills ── */}
        <div style={{ display:'flex', gap:7, overflowX:'auto', paddingBottom:10, marginBottom:14, scrollbarWidth:'none' }}>
          {TYPES.map(({ value, label, Icon, color, bg, gradient }) => {
            const active = filter === value
            return (
              <button key={value || 'ALL'} type="button" className="pill-btn" onClick={() => setFilter(value)}
                style={{
                  border: active ? 'none' : '1.5px solid #F0E0E6',
                  background: active ? gradient : '#fff',
                  color: active ? '#fff' : '#625B66',
                  borderRadius:999, padding:'8px 13px',
                  display:'inline-flex', alignItems:'center', gap:6,
                  whiteSpace:'nowrap', fontWeight:800, fontSize:12,
                  boxShadow: active ? `0 6px 16px ${color}40` : 'none',
                  fontFamily:'inherit',
                }}>
                <Icon size={13} /> {label}
              </button>
            )
          })}
        </div>

        {error && (
          <div style={{ background:'linear-gradient(135deg,#FEF2F2,#FFF5F5)', color:'#B42345', borderRadius:16, padding:'12px 14px', marginBottom:14, fontSize:13, fontWeight:700, border:'1px solid #FCA5A5', display:'flex', gap:8, alignItems:'center' }}>
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {/* ── Records List ── */}
        <section style={{ display:'grid', gap:10 }}>
          {loading ? (
            <div style={{ background:'#fff', borderRadius:22, padding:28, textAlign:'center', color:'#8D848E', border:'1px solid #F2E5EA' }}>
              <Loader2 className="spin" size={26} color="#FF5C8A" style={{ display:'block', margin:'0 auto 10px' }} />
              <p style={{ margin:0, fontSize:13, fontWeight:700 }}>Đang tải sổ sức khỏe...</p>
            </div>
          ) : records.length === 0 ? (
            <div style={{ background:'#fff', borderRadius:28, padding:'36px 24px', textAlign:'center', border:'1px solid #F2E5EA', boxShadow:'0 8px 24px rgba(35,28,34,.04)' }}>
              <div style={{ width:72, height:72, borderRadius:24, background:'linear-gradient(135deg,#FFF0F5,#FFE1EA)', display:'grid', placeItems:'center', margin:'0 auto 16px' }}>
                <ClipboardPlus size={34} color="#FF8FAB" />
              </div>
              <h3 style={{ margin:'0 0 8px', fontSize:17, fontWeight:900, color:'#28232A' }}>Chưa có hồ sơ sức khỏe</h3>
              <p style={{ margin:'0 0 18px', fontSize:13, color:'#8D848E', lineHeight:1.55 }}>
                Thêm thủ công hoặc chụp giấy khám để AI điền nháp cho bạn.
              </p>
              <button type="button" onClick={openImport} style={{
                display:'inline-flex', alignItems:'center', gap:8,
                background:'linear-gradient(135deg,#FF5C8A,#FF8FAB)', color:'#fff',
                border:'none', borderRadius:999, padding:'11px 22px',
                fontSize:13, fontWeight:800, fontFamily:'inherit',
                boxShadow:'0 8px 20px rgba(255,92,138,.3)', cursor:'pointer',
              }}>
                <Sparkles size={15} /> Import tài liệu
              </button>
            </div>
          ) : records.map((record) => (
            <RecordCardPro key={record.id} record={record} onEdit={openEdit} onDelete={deleteRecord} />
          ))}
        </section>
      </main>

      {modalOpen && (
        <RecordFormModal
          editingId={editingId} form={form} setForm={setForm}
          saving={saving} onClose={() => setModalOpen(false)} onSubmit={submitForm}
        />
      )}
      {importOpen && (
        <ImportModal
          fileRef={fileRef} importing={importing} saving={saving}
          importFileName={importFileName} importText={importText}
          importWarnings={importWarnings} drafts={drafts} selectedDrafts={selectedDrafts}
          setSelectedDrafts={setSelectedDrafts} onAnalyzeFile={analyzeFile}
          onUpdateDraft={updateDraft} onSaveSelected={saveSelectedDrafts}
          onClose={() => setImportOpen(false)}
        />
      )}

      <Navbar />
    </div>
  )
}

/* ─── Record Card ─── */
function RecordCardPro({ record, onEdit, onDelete }) {
  const meta = typeMeta(record.recordType)
  const Icon = meta.Icon
  const due = daysUntil(record.nextFollowUpDate)
  const overdue = due !== null && due < 0
  const hasMainBody = record.diagnosis || record.notes
  const hasMedication = record.medicationName || record.medicationDosage

  return (
    <article className="record-card slide-up" style={{
      background:'linear-gradient(180deg,#FFFFFF 0%,#FFFCFD 100%)',
      borderRadius:26,
      padding:16,
      border:'1px solid #F1E3E9',
      boxShadow:'0 12px 34px rgba(35,28,34,.07)',
      overflow:'hidden',
    }}>
      <div style={{ display:'grid', gridTemplateColumns:'54px 1fr auto', gap:12, alignItems:'start' }}>
        <div style={{ width:54, height:54, borderRadius:18, background:meta.gradient, display:'grid', placeItems:'center', boxShadow:`0 10px 22px ${meta.color}38` }}>
          <Icon size={25} color="#fff" />
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:6 }}>
            <span style={{ fontSize:11, fontWeight:900, color:meta.color, background:meta.bg, borderRadius:999, padding:'4px 10px', textTransform:'uppercase', letterSpacing:.35 }}>
              {meta.label}
            </span>
            {record.severity === 'HIGH' && (
              <span style={{ fontSize:11, fontWeight:900, color:'#B42318', background:'#FEF3F2', borderRadius:999, padding:'4px 9px' }}>
                Cần chú ý
              </span>
            )}
          </div>
          <h2 style={{ margin:'0 0 7px', fontSize:17, fontWeight:900, color:'#211D23', lineHeight:1.25 }}>
            {record.title}
          </h2>
          <div style={{ display:'grid', gap:4, color:'#8D848E', fontSize:12, lineHeight:1.45, fontWeight:700 }}>
            <span>{formatDate(record.eventDate)}</span>
            {(record.facility || record.doctorName) && (
              <span>
                {record.facility || 'Cơ sở y tế chưa rõ'}
                {record.doctorName ? ` · BS. ${record.doctorName}` : ''}
              </span>
            )}
          </div>
        </div>
        <div style={{ display:'flex', gap:7 }}>
          <button type="button" className="icon-btn" onClick={() => onEdit(record)} aria-label="Sửa hồ sơ" style={{ ...iconBtnS, width:38, height:38, borderRadius:15 }}>
            <Edit3 size={15} />
          </button>
          <button type="button" className="icon-btn" onClick={() => onDelete(record)} aria-label="Xóa hồ sơ" style={{ ...iconBtnS, width:38, height:38, borderRadius:15, color:'#DC2626' }}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {hasMainBody && (
        <div style={{ marginTop:14, padding:'13px 14px', borderRadius:18, background:'#FFF9FB', border:'1px solid #F3E0E8', color:'#312A33', fontSize:13, lineHeight:1.6 }}>
          {record.diagnosis && <p style={{ margin:'0 0 9px' }}><strong style={{ color:'#211D23' }}>Chẩn đoán:</strong> {record.diagnosis}</p>}
          {record.notes && <p style={{ margin:0, whiteSpace:'pre-wrap' }}>{record.notes}</p>}
        </div>
      )}

      {hasMedication && (
        <div style={{ marginTop:10, display:'flex', gap:10, alignItems:'flex-start', borderRadius:17, padding:'11px 12px', background:'#F3FBF6', border:'1px solid #DCEFE4' }}>
          <Pill size={18} color="#16A34A" style={{ flexShrink:0, marginTop:1 }} />
          <div style={{ minWidth:0 }}>
            <p style={{ margin:0, fontSize:13, color:'#14532D', fontWeight:900 }}>{record.medicationName || 'Thuốc chưa rõ tên'}</p>
            {record.medicationDosage && <p style={{ margin:'4px 0 0', fontSize:12, color:'#49785A', lineHeight:1.45 }}>{record.medicationDosage}</p>}
          </div>
        </div>
      )}

      {record.nextFollowUpDate && (
        <div style={{ marginTop:11, display:'inline-flex', alignItems:'center', gap:7, borderRadius:999, padding:'8px 12px', fontSize:12, fontWeight:900, background:overdue ? '#FEF2F2' : '#FFF0F5', color:overdue ? '#DC2626' : '#FF5C8A', border:`1px solid ${overdue ? '#FCA5A5' : '#FFD3E0'}` }}>
          <Clock size={13} />
          {due === 0 ? 'Hôm nay tái khám' : due !== null && due > 0 ? `Còn ${due} ngày` : `Quá hạn ${Math.abs(due || 0)} ngày`}
          <span style={{ opacity:.68, fontWeight:700 }}>· {formatDate(record.nextFollowUpDate)}</span>
        </div>
      )}
    </article>
  )
}

/* ─── Smart medical text parser ─── */
const NORMAL_KEYWORDS = ['bình thường', 'không to', 'không sỏi', 'không ứ nước',
  'không phì đại', 'không tràn dịch', 'không giãn', 'không hẹp', 'đồng nhất',
  'kích thước không', 'giới hạn bình', 'không có', 'không thấy', 'không tổn thương']
const ABNORMAL_KEYWORDS = ['sỏi', 'polyp', 'nang', 'u ', 'viêm', 'phì đại', 'giãn',
  'tràn dịch', 'tăng âm', 'giảm âm', 'bất thường', 'hạn chế', 'tổn thương', 'thâm nhiễm',
  'd#', 'dày', 'to hơn', 'tăng kích', 'áp xe']

function getStatus(text) {
  const t = text.toLowerCase()
  if (ABNORMAL_KEYWORDS.some((k) => t.includes(k))) return 'abnormal'
  if (NORMAL_KEYWORDS.some((k) => t.includes(k))) return 'normal'
  return 'neutral'
}

function parseMedicalText(text) {
  if (!text) return null
  // Try to detect "Organ: finding." pattern — at least 2 pairs required
  const pattern = /([^\n:,]{2,30}):\s*([^:\n]{5,}?)(?=\s+[^\n:,]{2,30}:|$)/g
  const matches = []
  let m
  while ((m = pattern.exec(text)) !== null) {
    const organ = m[1].replace(/^[.\s]+/, '').trim()
    const finding = m[2].replace(/\.\s*$/, '').trim()
    if (organ && finding && !organ.includes(' ') || organ.split(' ').length <= 5) {
      matches.push({ organ, finding })
    }
  }
  return matches.length >= 2 ? matches : null
}

function extractSummary(text) {
  // Extract first line / sentence as summary
  const diagMatch = text.match(/chẩn đoán[:\s]+(.+?)(?:\n|$)/i)
  if (diagMatch) return diagMatch[1].trim()
  const firstSentence = text.split(/\n/)[0].trim()
  return firstSentence.length < 200 ? firstSentence : null
}

function StatusDot({ status }) {
  const map = {
    normal:   { bg: '#16A34A', title: 'Bình thường' },
    abnormal: { bg: '#F97316', title: 'Cần chú ý' },
    neutral:  { bg: '#94A3B8', title: 'Chưa rõ' },
  }
  const { bg, title } = map[status] || map.neutral
  return (
    <span title={title} style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: bg, flexShrink: 0, marginTop: 5,
    }} />
  )
}

function RecordDetail({ icon, label, labelColor, labelBg, borderColor, children, isDiagnosis }) {
  const [expanded, setExpanded] = useState(false)
  const text = typeof children === 'string' ? children : ''

  // Smart parse for diagnosis
  const parsed = isDiagnosis ? parseMedicalText(text) : null
  const summary = isDiagnosis ? extractSummary(text) : null

  if (isDiagnosis && parsed) {
    return (
      <div style={{
        borderRadius: 16, background: '#FAFAFA',
        border: '1px solid #D0DBFD', borderLeft: '3px solid #4A6CF7',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #EEF3FF' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 900, letterSpacing: .5,
            color: '#4A6CF7', background: '#EEF3FF', borderRadius: 999, padding: '3px 8px',
          }}>🩺 CHẨN ĐOÁN</span>
        </div>

        {/* Summary highlight */}
        {summary && (
          <div style={{ margin: '10px 12px 6px', padding: '10px 12px', borderRadius: 12, background: 'linear-gradient(135deg, #EEF3FF, #F5F8FF)', border: '1px solid #C7D7FD' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#3730A3', lineHeight: 1.5 }}>
              🔍 {summary}
            </p>
          </div>
        )}

        {/* Organ findings table */}
        <div style={{ padding: '6px 12px 12px' }}>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 900, color: '#94A3B8', letterSpacing: .5 }}>
            KẾT QUẢ TỪNG CƠ QUAN
          </p>
          <div style={{ display: 'grid', gap: 6 }}>
            {(expanded ? parsed : parsed.slice(0, 5)).map(({ organ, finding }, i) => {
              const status = getStatus(finding)
              const rowBg = status === 'normal' ? '#F0FDF4' : status === 'abnormal' ? '#FFF7ED' : '#F8FAFC'
              const findingColor = status === 'normal' ? '#15803D' : status === 'abnormal' ? '#C2410C' : '#475569'
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '90px 1fr 10px', gap: 8, alignItems: 'flex-start',
                  background: rowBg, borderRadius: 10, padding: '7px 10px',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#1E293B', lineHeight: 1.4 }}>
                    {organ}
                  </span>
                  <span style={{ fontSize: 12, color: findingColor, fontWeight: 600, lineHeight: 1.45 }}>
                    {finding}
                  </span>
                  <StatusDot status={status} />
                </div>
              )
            })}
          </div>

          {parsed.length > 5 && (
            <button type="button" onClick={() => setExpanded((v) => !v)} style={{
              marginTop: 8, background: 'none', border: 'none', padding: 0,
              fontSize: 12, fontWeight: 800, color: '#4A6CF7', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {expanded
                ? '▲ Thu gọn'
                : `▼ Xem thêm ${parsed.length - 5} cơ quan`}
            </button>
          )}
        </div>

        {/* Legend */}
        <div style={{ borderTop: '1px solid #EEF3FF', padding: '7px 12px', display: 'flex', gap: 12 }}>
          {[['#16A34A', 'Bình thường'], ['#F97316', 'Cần chú ý'], ['#94A3B8', 'Chưa rõ']].map(([c, lb]) => (
            <span key={lb} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#9C8EA0', fontWeight: 700 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, display: 'inline-block' }} />
              {lb}
            </span>
          ))}
        </div>
      </div>
    )
  }

  // Fallback: plain text with expand
  const isLong = text.length > 120
  const shown = isLong && !expanded ? text.slice(0, 120) + '…' : text

  return (
    <div style={{
      borderRadius: 14, background: '#FAFAFA',
      border: `1px solid ${borderColor}`,
      borderLeft: `3px solid ${labelColor}`,
      padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10, fontWeight: 900, letterSpacing: .5,
        color: labelColor, background: labelBg, borderRadius: 999, padding: '3px 8px', alignSelf: 'flex-start',
      }}>
        {icon} {label}
      </span>
      <p style={{ margin: 0, fontSize: 13, color: '#3A333B', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
        {isLong ? shown : children}
      </p>
      {isLong && (
        <button type="button" onClick={() => setExpanded((v) => !v)} style={{
          alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0,
          fontSize: 12, fontWeight: 800, color: labelColor, cursor: 'pointer',
        }}>
          {expanded ? '▲ Thu gọn' : '▼ Xem thêm'}
        </button>
      )}
    </div>
  )
}


function RecordCard({ record, onEdit, onDelete }) {
  const meta = typeMeta(record.recordType)
  const Icon = meta.Icon
  const due = daysUntil(record.nextFollowUpDate)
  const overdue = due !== null && due < 0
  const hasDetail = record.diagnosis || record.medicationName || record.notes

  return (
    <article className="record-card slide-up" style={{
      background: '#fff', borderRadius: 24, padding: '16px 16px 14px',
      border: '1px solid #F2E5EA', boxShadow: '0 6px 22px rgba(35,28,34,.05)',
    }}>
      {/* ── Header row ── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 17, flexShrink: 0,
          background: meta.gradient, display: 'grid', placeItems: 'center',
          boxShadow: `0 6px 16px ${meta.color}35`,
        }}>
          <Icon size={22} color="#fff" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'inline-block', fontSize: 10, fontWeight: 900, letterSpacing: .5,
            color: meta.color, background: meta.bg, borderRadius: 999, padding: '3px 9px', marginBottom: 5,
          }}>{meta.label.toUpperCase()}</span>
          <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: '#1E1523', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {record.title}
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: '#9C8EA0', fontWeight: 600 }}>
            {formatDate(record.eventDate)}
            {record.facility && <span style={{ color: '#C4B5C8' }}> · </span>}
            {record.facility}
            {record.doctorName && <span> · BS. {record.doctorName}</span>}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <button type="button" className="icon-btn" onClick={() => onEdit(record)} aria-label="Sửa" style={iconBtnS}>
            <Edit3 size={14} />
          </button>
          <button type="button" className="icon-btn" onClick={() => onDelete(record)} aria-label="Xóa" style={{ ...iconBtnS, color: '#DC2626' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* ── Detail blocks ── */}
      {hasDetail && (
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          {record.diagnosis && (
            <RecordDetail
              icon="🩺" label="Chẩn đoán"
              labelColor="#4A6CF7" labelBg="#EEF3FF" borderColor="#D0DBFD"
              isDiagnosis
            >
              {record.diagnosis}
            </RecordDetail>
          )}
          {record.medicationName && (
            <RecordDetail
              icon="💊" label="Thuốc"
              labelColor="#16A34A" labelBg="#EAF8EF" borderColor="#BBF7D0"
            >
              {record.medicationName}{record.medicationDosage ? `  ·  Liều: ${record.medicationDosage}` : ''}
              {record.medicationStatus === 'ACTIVE' ? '\n✅ Đang dùng' : record.medicationStatus === 'PAUSED' ? '\n⏸️ Tạm dừng' : record.medicationStatus === 'COMPLETED' ? '\n✔️ Đã hoàn thành' : ''}
            </RecordDetail>
          )}
          {record.notes && (
            <RecordDetail
              icon="📝" label="Lời dặn & ghi chú"
              labelColor="#64748B" labelBg="#F3F6F8" borderColor="#CBD5E1"
            >
              {record.notes}
            </RecordDetail>
          )}
        </div>
      )}

      {/* ── Follow-up badge ── */}
      {record.nextFollowUpDate && (
        <div style={{
          marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
          borderRadius: 999, padding: '7px 12px', fontSize: 12, fontWeight: 800,
          background: overdue ? '#FEF2F2' : '#F0FDF4',
          color: overdue ? '#DC2626' : '#16A34A',
          border: `1px solid ${overdue ? '#FCA5A5' : '#BBF7D0'}`,
        }}>
          <Clock size={12} />
          {due === 0 ? 'Hôm nay tái khám' : due !== null && due > 0 ? `Còn ${due} ngày` : `Quá hạn ${Math.abs(due || 0)} ngày`}
          <span style={{ opacity: .6, fontWeight: 600 }}>· {formatDate(record.nextFollowUpDate)}</span>
        </div>
      )}
    </article>
  )
}


/* ─── Import Modal ─── */
function ImportModal(props) {
  const { fileRef, importing, saving, importFileName, importText, importWarnings, drafts, selectedDrafts, setSelectedDrafts, onAnalyzeFile, onUpdateDraft, onSaveSelected, onClose } = props
  return (
    <div style={backdropS} onClick={onClose}>
      <div style={sheetS} onClick={(e) => e.stopPropagation()}>
        <div style={sheetHeaderS}>
          <div>
            <h2 style={{ margin:0, fontSize:20, fontWeight:900, color:'#1E1523' }}>Import sổ sức khỏe</h2>
            <p style={{ margin:'4px 0 0', color:'#9C8EA0', fontSize:12, fontWeight:600 }}>AI điền nháp — Ba mẹ kiểm tra trước khi lưu</p>
          </div>
          <button type="button" onClick={onClose} style={iconBtnS} aria-label="Đóng"><X size={18} /></button>
        </div>

        <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display:'none' }} onChange={onAnalyzeFile} />
        <button type="button" disabled={importing} onClick={() => fileRef.current?.click()} style={{
          width:'100%', border:'2px dashed #FFB3CC', borderRadius:22,
          background: importing ? '#FFF7FA' : 'linear-gradient(135deg,#FFF0F5,#FFF8FA)',
          color:'#FF5C8A', padding:'22px 18px',
          display:'grid', placeItems:'center', gap:8, fontFamily:'inherit', textAlign:'center',
          cursor: importing ? 'not-allowed' : 'pointer',
        }}>
          {importing
            ? <Loader2 className="spin" size={30} color="#FF5C8A" />
            : <UploadCloud size={30} color="#FF8FAB" />
          }
          <strong style={{ fontSize:14, fontWeight:800, color:'#28232A' }}>
            {importing ? 'Đang đọc tài liệu...' : 'Chọn ảnh / PDF giấy khám hoặc đơn thuốc'}
          </strong>
          <span style={{ fontSize:12, color:'#9C8EA0', fontWeight:600 }}>
            {importFileName || 'Hỗ trợ ảnh chụp rõ nét, PDF dạng text. Tối đa 10MB.'}
          </span>
        </button>

        {importWarnings.length > 0 && (
          <div style={{ background:'linear-gradient(135deg,#FFFBEB,#FFF9E8)', color:'#92400E', border:'1px solid #FDE68A', borderRadius:16, padding:'12px 14px', fontSize:13, lineHeight:1.5, fontWeight:600 }}>
            {importWarnings.map((w, i) => <p key={i} style={{ margin: i ? '6px 0 0' : 0 }}>⚠️ {w}</p>)}
          </div>
        )}

        {importText && (
          <details style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:16, padding:'12px 14px' }}>
            <summary style={{ cursor:'pointer', fontWeight:800, color:'#475569', fontSize:13 }}>📄 Văn bản AI đọc được</summary>
            <p style={{ whiteSpace:'pre-wrap', margin:'10px 0 0', color:'#64748B', fontSize:12, lineHeight:1.6 }}>{importText}</p>
          </details>
        )}

        {drafts.length > 0 && (
          <div style={{ display:'grid', gap:10 }}>
            {drafts.map((draft, i) => (
              <DraftCardV2 key={i} index={i} draft={draft}
                selected={Boolean(selectedDrafts[i])}
                onToggle={() => setSelectedDrafts((s) => ({ ...s, [i]: !s[i] }))}
                onChange={(patch) => onUpdateDraft(i, patch)}
              />
            ))}
            <button type="button" disabled={saving} onClick={onSaveSelected} style={{
              width:'100%', border:'none', borderRadius:18,
              background:'linear-gradient(135deg,#FF5C8A,#FF8FAB)',
              color:'#fff', padding:'15px', fontSize:15, fontWeight:800, fontFamily:'inherit',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              boxShadow:'0 8px 24px rgba(255,92,138,.3)',
              opacity: saving ? .7 : 1, cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? <Loader2 size={18} className="spin" /> : <CheckCircle2 size={18} />}
              {saving ? 'Đang lưu...' : 'Lưu các hồ sơ đã chọn'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Draft Card ─── */
function DraftCardV2({ draft, selected, onToggle, onChange }) {
  const meta = typeMeta(draft.recordType)
  const Icon = meta.Icon
  const hasClinicalText = draft.diagnosis || draft.notes
  const hasMedication = draft.medicationName || draft.medicationDosage

  return (
    <article style={{
      border: selected ? `1.5px solid ${meta.color}` : '1px solid #F1E3E9',
      borderRadius:24,
      padding:14,
      background:'#fff',
      boxShadow:selected ? '0 12px 34px rgba(35,28,34,.08)' : '0 8px 22px rgba(35,28,34,.04)',
    }}>
      <div style={{ display:'grid', gridTemplateColumns:'48px 1fr auto', gap:12, alignItems:'start' }}>
        <div style={{ width:48, height:48, borderRadius:17, background:meta.gradient, color:'#fff', display:'grid', placeItems:'center', boxShadow:`0 8px 20px ${meta.color}33` }}>
          <Icon size={23} />
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:5 }}>
            <span style={{ borderRadius:999, background:meta.bg, color:meta.color, padding:'4px 9px', fontSize:11, fontWeight:900, textTransform:'uppercase', letterSpacing:.3 }}>
              {meta.label}
            </span>
            <label style={{ display:'inline-flex', alignItems:'center', gap:5, color:selected ? '#16A34A' : '#9C8EA0', fontSize:11, fontWeight:800, cursor:'pointer' }}>
              <input type="checkbox" checked={selected} onChange={onToggle} style={{ width:14, height:14, accentColor:meta.color }} />
              {selected ? 'Sẽ lưu' : 'Bỏ qua'}
            </label>
          </div>
          <input
            value={draft.title || ''}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Tiêu đề hồ sơ"
            style={{ width:'100%', border:'none', outline:'none', background:'transparent', color:'#211D23', fontSize:16, fontWeight:900, lineHeight:1.25, padding:0, fontFamily:'inherit' }}
          />
          <p style={{ margin:'6px 0 0', color:'#8D848E', fontSize:12, lineHeight:1.45, fontWeight:700 }}>
            {formatDate(draft.eventDate)}
            {draft.facility ? ` · ${draft.facility}` : ''}
            {draft.doctorName ? ` · BS. ${draft.doctorName}` : ''}
          </p>
        </div>
        <button type="button" onClick={onToggle} aria-label={selected ? 'Bỏ chọn hồ sơ' : 'Chọn hồ sơ'} style={{ width:34, height:34, borderRadius:13, border:'1px solid #F0E0E6', background:selected ? meta.bg : '#fff', color:selected ? meta.color : '#A69BA8', display:'grid', placeItems:'center' }}>
          <CheckCircle2 size={17} />
        </button>
      </div>

      {hasClinicalText && (
        <div style={{ marginTop:13, border:'1px solid #F3E0E8', background:'#FFF9FB', borderRadius:18, padding:'12px 13px', color:'#312A33', fontSize:13, lineHeight:1.55 }}>
          {draft.diagnosis && <p style={{ margin:'0 0 9px' }}><strong style={{ color:'#211D23' }}>Chẩn đoán:</strong> {draft.diagnosis}</p>}
          {draft.notes && <p style={{ margin:0, whiteSpace:'pre-wrap' }}>{draft.notes}</p>}
        </div>
      )}

      {hasMedication && (
        <div style={{ marginTop:10, display:'flex', alignItems:'flex-start', gap:10, border:'1px solid #DCEFE4', background:'#F3FBF6', borderRadius:16, padding:'10px 11px' }}>
          <Pill size={18} color="#16A34A" style={{ marginTop:1, flexShrink:0 }} />
          <div style={{ minWidth:0 }}>
            <p style={{ margin:0, fontSize:13, color:'#14532D', fontWeight:900 }}>{draft.medicationName || 'Thuốc chưa rõ tên'}</p>
            {draft.medicationDosage && <p style={{ margin:'4px 0 0', fontSize:12, color:'#49785A', lineHeight:1.45 }}>{draft.medicationDosage}</p>}
          </div>
        </div>
      )}

      {draft.nextFollowUpDate && (
        <div style={{ marginTop:10, display:'inline-flex', alignItems:'center', gap:6, borderRadius:999, background:'#FFF0F5', color:'#FF5C8A', padding:'7px 10px', fontSize:12, fontWeight:900 }}>
          <CalendarPlus size={14} />
          Hẹn tiếp theo: {formatDate(draft.nextFollowUpDate)}
        </div>
      )}

      <details style={{ marginTop:12, borderTop:'1px solid #F4E9EE', paddingTop:10 }}>
        <summary style={{ cursor:'pointer', color:'#7A7280', fontSize:12, fontWeight:900 }}>Chỉnh sửa chi tiết</summary>
        <div style={{ display:'grid', gap:8, marginTop:10 }}>
          <select value={draft.recordType} onChange={(e) => onChange({ recordType: e.target.value })} style={inputS}>
            {TYPES.filter((t) => t.value).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <input type="date" value={draft.eventDate || ''} onChange={(e) => onChange({ eventDate: e.target.value })} style={inputS} />
            <input type="date" value={draft.nextFollowUpDate || ''} onChange={(e) => onChange({ nextFollowUpDate: e.target.value })} style={inputS} />
          </div>
          <input value={draft.facility || ''} onChange={(e) => onChange({ facility: e.target.value })} placeholder="Cơ sở y tế" style={inputS} />
          <input value={draft.doctorName || ''} onChange={(e) => onChange({ doctorName: e.target.value })} placeholder="Bác sĩ" style={inputS} />
          <textarea value={draft.diagnosis || ''} onChange={(e) => onChange({ diagnosis: e.target.value })} placeholder="Chẩn đoán / tình trạng" rows={3} style={inputS} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <input value={draft.medicationName || ''} onChange={(e) => onChange({ medicationName: e.target.value })} placeholder="Tên thuốc" style={inputS} />
            <input value={draft.medicationDosage || ''} onChange={(e) => onChange({ medicationDosage: e.target.value })} placeholder="Liều dùng" style={inputS} />
          </div>
          <textarea value={draft.notes || ''} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Ghi chú / lời dặn" rows={3} style={inputS} />
        </div>
      </details>
    </article>
  )
}

function DraftCard({ draft, index, selected, onToggle, onChange }) {
  const meta = typeMeta(draft.recordType)
  return (
    <article style={{
      border: selected ? `2px solid ${meta.color}` : '1.5px solid #F0E0E6',
      borderRadius:20, padding:14, background: selected ? meta.bg : '#fff',
      transition:'all .2s',
    }}>
      <label style={{ display:'flex', alignItems:'center', gap:9, marginBottom:12, fontWeight:800, color:'#28232A', cursor:'pointer' }}>
        <input type="checkbox" checked={selected} onChange={onToggle} style={{ width:16, height:16, accentColor:meta.color }} />
        <span style={{ fontSize:13 }}>Hồ sơ nháp #{index + 1}</span>
      </label>
      <div style={{ display:'grid', gap:8 }}>
        <select value={draft.recordType} onChange={(e) => onChange({ recordType: e.target.value })} style={inputS}>
          {TYPES.filter((t) => t.value).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input value={draft.title || ''} onChange={(e) => onChange({ title: e.target.value })} placeholder="Tiêu đề" style={inputS} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <input type="date" value={draft.eventDate || ''} onChange={(e) => onChange({ eventDate: e.target.value })} style={inputS} />
          <input type="date" value={draft.nextFollowUpDate || ''} onChange={(e) => onChange({ nextFollowUpDate: e.target.value })} style={inputS} />
        </div>
        <input value={draft.facility || ''} onChange={(e) => onChange({ facility: e.target.value })} placeholder="Cơ sở y tế" style={inputS} />
        <textarea value={draft.diagnosis || ''} onChange={(e) => onChange({ diagnosis: e.target.value })} placeholder="Chẩn đoán / tình trạng" rows={2} style={inputS} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <input value={draft.medicationName || ''} onChange={(e) => onChange({ medicationName: e.target.value })} placeholder="Tên thuốc" style={inputS} />
          <input value={draft.medicationDosage || ''} onChange={(e) => onChange({ medicationDosage: e.target.value })} placeholder="Liều dùng" style={inputS} />
        </div>
        <textarea value={draft.notes || ''} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Ghi chú / lời dặn" rows={2} style={inputS} />
      </div>
    </article>
  )
}

/* ─── Record Form Modal ─── */
function RecordFormModal({ editingId, form, setForm, saving, onClose, onSubmit }) {
  const meta = typeMeta(form.recordType)
  return (
    <div style={backdropS} onClick={onClose}>
      <form onSubmit={onSubmit} style={sheetS} onClick={(e) => e.stopPropagation()}>
        <div style={sheetHeaderS}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:13, background:meta.gradient, display:'grid', placeItems:'center', flexShrink:0 }}>
              <meta.Icon size={18} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin:0, fontSize:19, fontWeight:900, color:'#1E1523' }}>
                {editingId ? 'Cập nhật hồ sơ' : 'Thêm hồ sơ sức khỏe'}
              </h2>
              <p style={{ margin:'2px 0 0', fontSize:11, color:'#9C8EA0', fontWeight:600 }}>Điền thông tin bên dưới</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={iconBtnS} aria-label="Đóng"><X size={18} /></button>
        </div>

        <FormField label="Loại hồ sơ">
          <select value={form.recordType} onChange={(e) => setForm({ ...form, recordType: e.target.value })} style={inputS}>
            {TYPES.filter((t) => t.value).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </FormField>
        <FormField label="Tiêu đề *">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ví dụ: Khám tổng quát tháng 7" style={inputS} required />
        </FormField>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <FormField label="Ngày khám / ghi nhận">
            <input type="date" value={form.eventDate || ''} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} style={inputS} />
          </FormField>
          <FormField label="Ngày hẹn tiếp theo">
            <input type="date" value={form.nextFollowUpDate || ''} onChange={(e) => setForm({ ...form, nextFollowUpDate: e.target.value })} style={inputS} />
          </FormField>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <FormField label="Cơ sở y tế">
            <input value={form.facility} onChange={(e) => setForm({ ...form, facility: e.target.value })} placeholder="Tên bệnh viện / phòng khám" style={inputS} />
          </FormField>
          <FormField label="Bác sĩ">
            <input value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} placeholder="Tên bác sĩ" style={inputS} />
          </FormField>
        </div>
        <FormField label="Chẩn đoán / tình trạng">
          <textarea value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} rows={3} placeholder="Tình trạng khi khám, triệu chứng, kết luận..." style={inputS} />
        </FormField>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <FormField label="Tên thuốc">
            <input value={form.medicationName} onChange={(e) => setForm({ ...form, medicationName: e.target.value })} placeholder="Ví dụ: Vitamin D3" style={inputS} />
          </FormField>
          <FormField label="Liều dùng">
            <input value={form.medicationDosage} onChange={(e) => setForm({ ...form, medicationDosage: e.target.value })} placeholder="1 giọt/ngày" style={inputS} />
          </FormField>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <FormField label="Mức độ">
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} style={inputS}>
              <option value="LOW">🟢 Nhẹ</option>
              <option value="MEDIUM">🟡 Trung bình</option>
              <option value="HIGH">🔴 Cần chú ý</option>
            </select>
          </FormField>
          <FormField label="Trạng thái thuốc">
            <select value={form.medicationStatus} onChange={(e) => setForm({ ...form, medicationStatus: e.target.value })} style={inputS}>
              <option value="ACTIVE">✅ Đang dùng</option>
              <option value="PAUSED">⏸️ Tạm dừng</option>
              <option value="COMPLETED">✔️ Đã xong</option>
            </select>
          </FormField>
        </div>
        <FormField label="Bệnh di truyền từ phía">
          <select value={form.hereditarySide} onChange={(e) => setForm({ ...form, hereditarySide: e.target.value })} style={inputS}>
            <option value="UNKNOWN">Chưa rõ</option>
            <option value="MATERNAL">Bên mẹ</option>
            <option value="PATERNAL">Bên ba</option>
            <option value="BOTH">Cả hai bên</option>
          </select>
        </FormField>
        <FormField label="Ghi chú & lời dặn">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Lưu ý chăm sóc, dặn dò của bác sĩ..." style={inputS} />
        </FormField>

        <button type="submit" disabled={saving} style={{
          width:'100%', border:'none', borderRadius:18, marginTop:4,
          background:'linear-gradient(135deg,#FF5C8A,#FF8FAB)',
          color:'#fff', padding:'16px', fontSize:15, fontWeight:800, fontFamily:'inherit',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          boxShadow:'0 8px 24px rgba(255,92,138,.3)',
          opacity: saving ? .7 : 1, cursor: saving ? 'not-allowed' : 'pointer',
        }}>
          {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
          {saving ? 'Đang lưu...' : (editingId ? 'Cập nhật hồ sơ' : 'Lưu hồ sơ')}
        </button>
      </form>
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <label style={{ display:'grid', gap:6, marginBottom:10, fontSize:12, fontWeight:800, color:'#514A54', letterSpacing:.2 }}>
      {label}
      {children}
    </label>
  )
}

/* ─── Shared styles ─── */
const iconBtnS = {
  width:36, height:36, borderRadius:12, border:'1.5px solid #F0E0E6',
  background:'#fff', color:'#7A7280', display:'grid', placeItems:'center', fontFamily:'inherit', cursor:'pointer',
}
const backdropS = {
  position:'fixed', inset:0, zIndex:120, background:'rgba(17,24,39,.5)',
  display:'flex', alignItems:'center', justifyContent:'center',
  backdropFilter:'blur(6px)', padding:18,
}
const sheetS = {
  width:'min(520px, 100%)', maxHeight:'min(88vh, 760px)', overflowY:'auto',
  background:'#fff', borderRadius:28,
  padding:'20px 18px 24px', boxShadow:'0 28px 90px rgba(17,24,39,.28)',
  display:'grid', gap:0,
}
const sheetHeaderS = {
  display:'flex', alignItems:'center', justifyContent:'space-between',
  gap:12, marginBottom:16, paddingBottom:14, borderBottom:'1px solid #F5EDF1',
}
const inputS = {
  width:'100%', border:'1.5px solid #EEE0E6',
  background:'#FFFDFE', borderRadius:13, padding:'11px 12px',
  fontSize:14, fontFamily:'inherit', outline:'none', color:'#28232A',
  transition:'border-color .15s', boxSizing:'border-box',
}
