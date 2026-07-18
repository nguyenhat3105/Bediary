import { useState } from 'react'
import { Sparkles, Image, Copy, Loader2, Send } from 'lucide-react'
import Navbar from '../components/Navbar'
import { aiApi } from '../api/api'

export default function AiAssistantPage() {
  const [tab, setTab] = useState('chat')
  const [question, setQuestion] = useState('')
  const [context, setContext] = useState('')
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Ba mẹ hỏi mình về lịch sinh hoạt, ăn ngủ, tăng trưởng, tiêm chủng hoặc cách theo dõi bé nhé.' },
  ])
  const [chatLoading, setChatLoading] = useState(false)

  const [imageUrl, setImageUrl] = useState('')
  const [captions, setCaptions] = useState([])
  const [captionLoading, setCaptionLoading] = useState(false)
  const [error, setError] = useState('')

  const askAssistant = async () => {
    const text = question.trim()
    if (!text) return
    setError('')
    setQuestion('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setChatLoading(true)
    try {
      const res = await aiApi.chat({ question: text, context: context.trim() || undefined })
      const answer = res.data?.answer || 'Mình chưa có câu trả lời phù hợp lúc này.'
      const safetyNote = res.data?.safetyNote
      setMessages(prev => [...prev, { role: 'assistant', text: safetyNote ? `${answer}\n\n${safetyNote}` : answer }])
    } catch (err) {
      const data = err.response?.data
      const fieldErrors = data?.fieldErrors ? Object.entries(data.fieldErrors).map(([field, message]) => `${field}: ${message}`).join('; ') : ''
      setMessages(prev => [...prev, { role: 'assistant', text: data?.message || fieldErrors || 'AI chưa thể trả lời lúc này. Ba mẹ thử lại sau nhé.' }])
    } finally {
      setChatLoading(false)
    }
  }

  const generateCaption = async () => {
    if (!imageUrl.trim()) { setError('Nhập link ảnh để AI gợi ý caption.'); return }
    setCaptionLoading(true)
    setError('')
    setCaptions([])
    try {
      const res = await aiApi.caption(imageUrl.trim())
      setCaptions(res.data?.captions ?? [])
    } catch (err) {
      setError(err.response?.data?.message || 'AI chưa thể tạo gợi ý lúc này.')
    } finally {
      setCaptionLoading(false)
    }
  }

  const copy = async (text) => navigator.clipboard.writeText(text)

  return (
    <>
      <Navbar />
      <main className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <h1 className="text-page-title">Trợ lí AI</h1>
          <p className="text-desc" style={{ marginTop: 6 }}>Hỏi đáp chăm sóc bé và gợi ý caption ảnh. AI chỉ hỗ trợ tham khảo, không thay thế bác sĩ.</p>
        </div>

        <div className="tab-bar">
          <button className={`tab-item${tab === 'chat' ? ' active' : ''}`} onClick={() => setTab('chat')}>Hỏi đáp</button>
          <button className={`tab-item${tab === 'caption' ? ' active' : ''}`} onClick={() => setTab('caption')}>Caption ảnh</button>
        </div>

        {tab === 'chat' && (
          <section className="card card-lg" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="activity-icon activity-icon-pink"><Sparkles size={22} /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
              {messages.map((msg, index) => (
                <div key={index} className="card" style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '92%',
                  background: msg.role === 'user' ? 'var(--c-primary-light)' : 'white',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--c-border)',
                  padding: '12px 14px',
                  whiteSpace: 'pre-line',
                }}>
                  <p className="text-desc">{msg.text}</p>
                </div>
              ))}
              {chatLoading && <p className="text-small">AI đang trả lời...</p>}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Ngữ cảnh thêm, nếu có</label>
              <input className="input" placeholder="VD: bé vừa tiêm, hôm nay bú ít hơn..." value={context} onChange={e => setContext(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="input" placeholder="Ba mẹ muốn hỏi gì?" value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') askAssistant() }} />
              <button className="btn btn-primary" onClick={askAssistant} disabled={chatLoading || !question.trim()} style={{ flexShrink: 0 }}>
                {chatLoading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
              </button>
            </div>
          </section>
        )}

        {tab === 'caption' && (
          <>
            <div className="card card-lg" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="activity-icon activity-icon-pink"><Image size={22} /></div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Link ảnh</label>
                <input className="input" placeholder="https://..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
              </div>
              {imageUrl && <div style={{ borderRadius: 16, overflow: 'hidden', background: 'var(--c-bg-soft)', aspectRatio: '16/10' }}><img src={imageUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} /></div>}
              {error && <div className="card card-warning" style={{ padding: '10px 14px', color: 'var(--c-warning)', fontSize: 13 }}>{error}</div>}
              <button className="btn btn-primary w-full" onClick={generateCaption} disabled={captionLoading}>{captionLoading ? <><Loader2 size={16} className="spin" /> Đang nghĩ...</> : <><Image size={16} /> Tạo caption</>}</button>
            </div>
            {captions.length > 0 && <section><div className="section-header"><span className="section-title">Gợi ý caption</span></div><div className="space-y-sm">{captions.map((caption, index) => <div key={index} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}><p className="text-desc" style={{ flex: 1 }}>{caption}</p><button className="btn-icon" onClick={() => copy(caption)} aria-label="Sao chép"><Copy size={16} /></button></div>)}</div></section>}
          </>
        )}
      </main>
      <style>{`.spin { animation: spin .9s linear infinite } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}


