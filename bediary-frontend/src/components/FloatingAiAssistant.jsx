import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bot, ChevronDown, Loader2, MessageCircle, RefreshCw, Send, X } from 'lucide-react'
import { aiApi, dashboardApi, growthApi, healthApi, routineApi, trackingApi, vaccinationApi } from '../api/api'

function unwrap(response) {
  return response?.data ?? response
}

function listFromResponse(response) {
  const data = unwrap(response)
  return Array.isArray(data) ? data : data?.content ?? []
}

function summarizeTracking(logs, today) {
  const countByType = logs.reduce((acc, log) => {
    const type = log.activityType || 'CUSTOM'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})
  const notes = logs.map((log) => log.metadata?.note).filter(Boolean)
  const milkMl = logs
    .filter((log) => log.activityType === 'FEED')
    .reduce((sum, log) => sum + (Number(log.metadata?.milkMl || log.metadata?.amountMl || log.metadata?.ml) || 0), 0)

  return [
    `Nhật ký ngày ${today}:`,
    `Tổng hoạt động: ${logs.length}`,
    `Ăn/bú: ${countByType.FEED || 0} lần${milkMl ? `, khoảng ${milkMl} ml` : ''}`,
    `Ngủ: ${countByType.SLEEP || 0} lần`,
    `Đi tiểu: ${countByType.PEE || 0} lần`,
    `Đi tiêu: ${countByType.POOP || 0} lần`,
    `Thay tã cũ: ${countByType.DIAPER || 0} lần`,
    `Tắm: ${countByType.BATH || 0} lần`,
    notes.length ? `Ghi chú: ${notes.join('; ')}` : 'Chưa có ghi chú bất thường.',
    'Yêu cầu: nhận xét nếp sinh hoạt hôm nay, điểm ổn, điểm nên theo dõi và gợi ý nhẹ nhàng cho ba mẹ.',
  ].join('\n')
}

function summarizeHealth(records, upcoming) {
  const activeMeds = records.filter((item) => item.recordType === 'MEDICATION' && item.medicationStatus === 'ACTIVE')
  const conditions = records.filter((item) => item.recordType === 'CONDITION')
  const hereditary = records.filter((item) => item.recordType === 'HEREDITARY')
  const allergies = records.filter((item) => item.recordType === 'ALLERGY')
  return [
    'Dữ liệu sổ sức khỏe gia đình:',
    upcoming.length ? `Lịch khám/tái khám sắp tới:\n- ${upcoming.slice(0, 6).map((item) => `${item.title}, ngày ${item.nextFollowUpDate || item.eventDate || 'chưa rõ'}`).join('\n- ')}` : 'Chưa có lịch khám hoặc tái khám sắp tới.',
    activeMeds.length ? `Thuốc đang dùng:\n- ${activeMeds.map((item) => `${item.medicationName || item.title}${item.medicationDosage ? `, ${item.medicationDosage}` : ''}`).join('\n- ')}` : 'Chưa có thuốc đang dùng.',
    conditions.length ? `Bệnh lý đã lưu:\n- ${conditions.slice(0, 6).map((item) => `${item.title}${item.diagnosis ? `: ${item.diagnosis}` : ''}`).join('\n- ')}` : 'Chưa có bệnh lý đã lưu.',
    hereditary.length ? `Tiền sử di truyền:\n- ${hereditary.slice(0, 6).map((item) => `${item.title}${item.hereditarySide ? ` (${item.hereditarySide})` : ''}`).join('\n- ')}` : 'Chưa có tiền sử di truyền đã lưu.',
    allergies.length ? `Dị ứng:\n- ${allergies.slice(0, 6).map((item) => item.title).join('\n- ')}` : 'Chưa có dị ứng đã lưu.',
    'Yêu cầu: tóm tắt điều cần theo dõi, nhắc lịch phù hợp, không chẩn đoán thay bác sĩ và nêu khi nào cần đi khám.',
  ].join('\n')
}

function summarizeGrowth(latest, history) {
  const rows = history.slice(0, 5).map((item) => `${item.recordedAt || 'chưa rõ ngày'}: ${item.weightKg ?? '--'} kg, ${item.heightCm ?? '--'} cm`)
  return [
    'Dữ liệu tăng trưởng:',
    latest ? `Mới nhất: ${latest.weightKg ?? '--'} kg, ${latest.heightCm ?? '--'} cm. Nhận xét hệ thống: ${latest.statusText || 'chưa có'}. Gợi ý: ${latest.suggestion || 'chưa có'}.` : 'Chưa có chỉ số mới nhất.',
    rows.length ? `Lịch sử gần đây:\n- ${rows.join('\n- ')}` : 'Chưa có lịch sử đo.',
    'Yêu cầu: nhận xét xu hướng, không chẩn đoán, nêu dữ liệu còn thiếu nếu cần.',
  ].join('\n')
}

function summarizeVaccinations(vaccinations) {
  const upcoming = vaccinations.filter((item) => !item.completedAt).slice(0, 8)
  const completed = vaccinations.filter((item) => item.completedAt).slice(0, 5)
  return [
    'Dữ liệu lịch tiêm:',
    upcoming.length ? `Sắp tới:\n- ${upcoming.map((v) => `${v.vaccineName || v.name} mũi ${v.doseNumber || ''}, dự kiến ${v.scheduledDate || 'chưa rõ'}`).join('\n- ')}` : 'Không có mũi tiêm sắp tới.',
    completed.length ? `Đã hoàn thành gần đây:\n- ${completed.map((v) => `${v.vaccineName || v.name}, hoàn thành ${v.completedAt}`).join('\n- ')}` : 'Chưa có mũi tiêm hoàn thành gần đây.',
    'Yêu cầu: nhắc điều cần theo dõi sau tiêm và khi nào cần hỏi bác sĩ.',
  ].join('\n')
}

function summarizeRoutines(routines) {
  return [
    'Dữ liệu lịch sinh hoạt:',
    routines.length ? routines.slice(0, 10).map((r) => `- ${r.title || r.name || 'Hoạt động'}: ${r.time || r.scheduledTime || 'chưa rõ giờ'}, trạng thái ${r.status || 'chưa rõ'}`).join('\n') : 'Chưa có lịch sinh hoạt nào.',
    'Yêu cầu: gợi ý cách sắp xếp lịch sinh hoạt dễ thực hiện, không quá cứng nhắc.',
  ].join('\n')
}

async function buildAssistantContext(pathname) {
  if (pathname.startsWith('/tracking')) {
    const today = new Date().toISOString().slice(0, 10)
    const logs = listFromResponse(await trackingApi.daily(today))
    return {
      title: 'Nhật ký hôm nay',
      eyebrow: 'Dựa trên hoạt động trong ngày',
      question: 'Hãy nhận xét chế độ sinh hoạt của bé hôm nay từ dữ liệu nhật ký này. Ba mẹ nên điều chỉnh gì?',
      suggestions: ['Nhận xét ngày hôm nay', 'Bé bú và ngủ có ổn không?', 'Gợi ý lịch tối nay'],
      context: summarizeTracking(logs, today),
    }
  }

  if (pathname.startsWith('/health')) {
    const [recordsResult, upcomingResult] = await Promise.allSettled([healthApi.list(), healthApi.upcoming(90)])
    const records = recordsResult.status === 'fulfilled' ? listFromResponse(recordsResult.value) : []
    const upcoming = upcomingResult.status === 'fulfilled' ? listFromResponse(upcomingResult.value) : []
    return {
      title: 'Sổ sức khỏe',
      eyebrow: 'Lịch khám, thuốc và tiền sử sức khỏe',
      question: 'Hãy xem sổ sức khỏe của bé và nhắc ba mẹ những điểm cần theo dõi trong thời gian tới.',
      suggestions: ['Tóm tắt sức khỏe gần đây', 'Có lịch khám nào sắp tới?', 'Thuốc đang dùng cần lưu ý gì?'],
      context: summarizeHealth(records, upcoming),
    }
  }

  if (pathname.startsWith('/growth')) {
    const [latestResult, historyResult] = await Promise.allSettled([growthApi.latest(), growthApi.history(0)])
    const latest = latestResult.status === 'fulfilled' ? unwrap(latestResult.value) : null
    const history = historyResult.status === 'fulfilled' ? listFromResponse(historyResult.value) : []
    return {
      title: 'Tăng trưởng',
      eyebrow: 'Cân nặng, chiều cao và xu hướng',
      question: 'Hãy nhận xét tình hình tăng trưởng của bé dựa trên chỉ số mới nhất và lịch sử đo.',
      suggestions: ['Nhận xét chỉ số mới nhất', 'Ba mẹ nên đo lại khi nào?', 'Có điểm nào cần theo dõi?'],
      context: summarizeGrowth(latest, history),
    }
  }

  if (pathname.startsWith('/vaccinations')) {
    const vaccinations = listFromResponse(await vaccinationApi.list())
    return {
      title: 'Lịch tiêm',
      eyebrow: 'Nhắc lịch và mũi cần chú ý',
      question: 'Hãy kiểm tra lịch tiêm của bé và nhắc ba mẹ những mũi cần chú ý sắp tới.',
      suggestions: ['Mũi nào sắp tới?', 'Sau tiêm cần theo dõi gì?', 'Có mũi nào trễ hạn không?'],
      context: summarizeVaccinations(vaccinations),
    }
  }

  if (pathname.startsWith('/routines')) {
    const routines = listFromResponse(await routineApi.list())
    return {
      title: 'Lịch sinh hoạt',
      eyebrow: 'Nếp ngủ, ăn và chăm sóc',
      question: 'Hãy nhận xét lịch sinh hoạt hiện tại của bé và gợi ý cách sắp xếp nhẹ nhàng hơn.',
      suggestions: ['Tối ưu lịch hôm nay', 'Gợi ý giờ ngủ phù hợp', 'Việc nào nên ưu tiên?'],
      context: summarizeRoutines(routines),
    }
  }

  if (pathname === '/') {
    const dashboard = unwrap(await dashboardApi.get())
    return {
      title: 'Tổng quan hôm nay',
      eyebrow: 'Tóm tắt dữ liệu gia đình',
      question: 'Hãy nhìn tổng quan dữ liệu hôm nay và gợi ý điều ba mẹ nên chú ý khi chăm sóc bé.',
      suggestions: ['Hôm nay cần chú ý gì?', 'Tóm tắt nhanh cho ba mẹ', 'Gợi ý việc tiếp theo'],
      context: `Dữ liệu tổng quan:\n${JSON.stringify(dashboard, null, 2).slice(0, 3000)}`,
    }
  }

  return {
    title: 'Trợ lý AI',
    eyebrow: 'Hỏi nhanh về chăm sóc bé',
    question: 'Ba mẹ nên lưu ý gì hôm nay khi chăm sóc bé?',
    suggestions: ['Tư vấn chăm sóc hôm nay', 'Dấu hiệu nào cần đi khám?', 'Gợi ý lịch sinh hoạt nhẹ nhàng'],
    context: `Trang hiện tại: ${pathname}`,
  }
}

export default function FloatingAiAssistant() {
  const location = useLocation()
  const messagesEndRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [sending, setSending] = useState(false)
  const [title, setTitle] = useState('Trợ lý AI')
  const [eyebrow, setEyebrow] = useState('Hỏi nhanh về chăm sóc bé')
  const [question, setQuestion] = useState('')
  const [context, setContext] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')

  const token = localStorage.getItem('bediary_token')
  const hidden = useMemo(() => ['/login', '/register'].includes(location.pathname), [location.pathname])

  useEffect(() => {
    if (!open || !token) return
    let alive = true
    setPreparing(true)
    setError('')
    buildAssistantContext(location.pathname)
      .then((prepared) => {
        if (!alive) return
        setTitle(prepared.title)
        setEyebrow(prepared.eyebrow)
        setQuestion(prepared.question)
        setContext(prepared.context)
        setSuggestions(prepared.suggestions || [])
        setMessages([{ role: 'assistant', content: 'Mình đã lấy dữ liệu phù hợp với trang hiện tại. Ba mẹ có thể chọn gợi ý nhanh hoặc nhập câu hỏi riêng.' }])
      })
      .catch(() => {
        if (!alive) return
        setTitle('Trợ lý AI')
        setEyebrow('Hỏi nhanh về chăm sóc bé')
        setQuestion('Hãy tư vấn nhanh cho ba mẹ về việc chăm sóc bé hôm nay.')
        setContext(`Trang hiện tại: ${location.pathname}`)
        setSuggestions(['Tư vấn chăm sóc hôm nay', 'Dấu hiệu nào cần đi khám?', 'Gợi ý lịch sinh hoạt nhẹ nhàng'])
        setMessages([{ role: 'assistant', content: 'Mình chưa lấy được dữ liệu trang này, nhưng vẫn có thể trả lời theo câu hỏi của ba mẹ.' }])
      })
      .finally(() => alive && setPreparing(false))
    return () => {
      alive = false
    }
  }, [open, location.pathname, token])

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, open, sending])

  if (!token || hidden) return null

  const sendQuestion = async (overrideQuestion) => {
    const trimmed = (overrideQuestion || question).trim()
    if (!trimmed || sending || preparing) return
    setQuestion(trimmed)
    setMessages((items) => [...items, { role: 'user', content: trimmed }])
    setSending(true)
    setError('')
    try {
      const response = await aiApi.chat({ question: trimmed, context })
      const data = unwrap(response)
      const answer = data.answer || data.message || 'AI chưa có phản hồi phù hợp.'
      const safetyNote = data.safetyNote ? `\n\n${data.safetyNote}` : ''
      setMessages((items) => [...items, { role: 'assistant', content: `${answer}${safetyNote}` }])
    } catch (err) {
      const data = err.response?.data
      const fieldErrors = data?.fieldErrors ? Object.entries(data.fieldErrors).map(([field, message]) => `${field}: ${message}`).join('; ') : ''
      setError(data?.message || fieldErrors || 'Không thể gọi trợ lý AI. Kiểm tra backend/API key hoặc thử lại sau nhé.')
    } finally {
      setSending(false)
    }
  }

  const resetContext = () => {
    setMessages([])
    setOpen(false)
    window.setTimeout(() => setOpen(true), 0)
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Mở trợ lý AI" style={styles.launcher}>
        <MessageCircle size={25} />
        <span style={styles.onlineDot} />
      </button>

      {open && (
        <div style={styles.overlay} onClick={() => setOpen(false)}>
          <section style={styles.panel} onClick={(event) => event.stopPropagation()}>
            <header style={styles.header}>
              <div style={styles.headerTop}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={styles.avatar}><Bot size={23} /></div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, opacity: 0.82, fontSize: 12, fontWeight: 600 }}>{eyebrow}</p>
                    <h3 style={{ margin: '2px 0 0', fontSize: 18, lineHeight: 1.2 }}>Trợ lý Bediary</h3>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={resetContext} aria-label="Tải lại ngữ cảnh" style={styles.headerButton}><RefreshCw size={16} /></button>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Đóng trợ lý AI" style={styles.headerButton}><X size={17} /></button>
                </div>
              </div>
              <div style={styles.contextCard}>
                <strong style={{ fontSize: 13 }}>{title}</strong>
                <p style={{ margin: '7px 0 0', fontSize: 12, opacity: 0.88, lineHeight: 1.45 }}>
                  AI dùng dữ liệu trên trang hiện tại để phản hồi cụ thể hơn cho ba mẹ.
                </p>
              </div>
            </header>

            <main style={styles.body}>
              {preparing ? (
                <div style={{ ...styles.assistantBubble, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Loader2 size={16} className="spin" /> Đang lấy dữ liệu trang hiện tại...
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                    {suggestions.map((item) => (
                      <button key={item} type="button" style={styles.promptButton} onClick={() => sendQuestion(item)}>
                        {item}
                      </button>
                    ))}
                  </div>
                  {messages.map((message, index) => (
                    <div key={`${message.role}-${index}`} style={message.role === 'user' ? styles.userBubble : styles.assistantBubble}>
                      {message.content}
                    </div>
                  ))}
                </>
              )}

              {sending && (
                <div style={{ ...styles.assistantBubble, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--c-text-2)' }}>
                  <Loader2 size={16} className="spin" /> Đang suy nghĩ...
                </div>
              )}
              {error && <div style={styles.error}>{error}</div>}
              <div ref={messagesEndRef} />
            </main>

            <footer style={styles.footer}>
              <div style={{ position: 'relative' }}>
                <textarea
                  rows={2}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Nhập câu hỏi cho trợ lý AI..."
                  style={styles.input}
                />
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, bottom: 10, color: '#A0A4AE', pointerEvents: 'none' }} />
              </div>
              <button type="button" onClick={() => sendQuestion()} disabled={sending || preparing || !question.trim()} aria-label="Gửi câu hỏi" style={{ ...styles.sendButton, opacity: sending || preparing || !question.trim() ? 0.55 : 1 }}>
                {sending ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  )
}

const styles = {
  launcher: {
    position: 'fixed',
    right: 18,
    bottom: 92,
    zIndex: 80,
    width: 60,
    height: 60,
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.55)',
    background: 'linear-gradient(145deg, #FF5C8A 0%, #7B61FF 100%)',
    color: '#fff',
    boxShadow: '0 18px 42px rgba(123, 97, 255, 0.32)',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
  },
  onlineDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 999,
    background: '#36B66D',
    border: '3px solid #fff',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 120,
    background: 'rgba(17, 24, 39, 0.42)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  panel: {
    width: 'min(460px, 100%)',
    height: 'min(760px, 88vh)',
    background: '#fff',
    borderRadius: 24,
    boxShadow: '0 28px 90px rgba(17, 24, 39, 0.28)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: 18,
    color: '#fff',
    background: 'linear-gradient(145deg, #FF5C8A 0%, #7B61FF 56%, #4A6CF7 100%)',
  },
  headerTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.18)',
    border: '1px solid rgba(255,255,255,0.35)',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  headerButton: {
    width: 38,
    height: 38,
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 14,
    color: '#fff',
    background: 'rgba(255,255,255,0.14)',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
  },
  contextCard: {
    marginTop: 16,
    borderRadius: 18,
    padding: 12,
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.22)',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    background: 'linear-gradient(180deg, #FFF7FA 0%, #FFFFFF 36%)',
  },
  promptButton: {
    border: '1px solid #F1D7E2',
    background: '#fff',
    color: '#B4235C',
    borderRadius: 999,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    borderRadius: '18px 18px 18px 6px',
    padding: '12px 14px',
    background: '#fff',
    color: 'var(--c-text-1)',
    border: '1px solid #F0F0F0',
    boxShadow: 'var(--shadow-xs)',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.55,
    fontSize: 14,
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '88%',
    borderRadius: '18px 18px 6px 18px',
    padding: '12px 14px',
    background: '#4A6CF7',
    color: '#fff',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.55,
    fontSize: 14,
  },
  error: { background: '#FFF0F3', color: '#B42345', borderRadius: 14, padding: 12, fontSize: 13, lineHeight: 1.45 },
  footer: { padding: 14, borderTop: '1px solid #F0F0F0', background: '#fff', display: 'grid', gridTemplateColumns: '1fr 48px', gap: 10, alignItems: 'end' },
  input: { width: '100%', minHeight: 52, maxHeight: 118, border: '1.5px solid #F0F0F0', background: '#FAFAFA', borderRadius: 18, resize: 'none', padding: '12px 14px', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.45, outline: 'none' },
  sendButton: { width: 48, height: 48, borderRadius: 16, border: 'none', background: '#FF5C8A', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-pink)' },
}
