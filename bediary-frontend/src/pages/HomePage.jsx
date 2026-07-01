import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, TrendingUp, Syringe, Camera, Calendar, Flame, Baby, ChevronRight } from 'lucide-react'
import Navbar from '../components/Navbar'
import { dashboardApi, routineApi } from '../api/api'

const ACTIVITY_EMOJI = {
  FEED: '🍼',
  SLEEP: '😴',
  BATH: '🛁',
  CUSTOM: '⭐',
}

const ACTIVITY_ICON_CLASS = {
  FEED: 'activity-icon-pink',
  SLEEP: 'activity-icon-purple',
  BATH: 'activity-icon-blue',
  CUSTOM: 'activity-icon-orange',
}

export default function HomePage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loggingId, setLoggingId] = useState(null)
  const [loggedIds, setLoggedIds] = useState([])

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      setLoading(true)
      const res = await dashboardApi.get()
      setData(res)
    } catch (err) {
      console.error('Lỗi tải trang chủ:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleLog(routine) {
    if (loggingId === routine.id || loggedIds.includes(routine.id)) return
    try {
      setLoggingId(routine.id)
      await routineApi.log(routine.id, { loggedAt: new Date().toISOString() })
      setLoggedIds(prev => [...prev, routine.id])
    } catch (err) {
      console.error('Lỗi ghi nhật ký:', err)
    } finally {
      setLoggingId(null)
    }
  }

  const getStatusBadge = (status) => {
    if (!status) return null
    const map = {
      NORMAL: { cls: 'badge-success', label: 'Bình thường' },
      UNDERWEIGHT: { cls: 'badge-warning', label: 'Nhẹ cân' },
      OVERWEIGHT: { cls: 'badge-warning', label: 'Thừa cân' },
      SEVERELY_UNDERWEIGHT: { cls: 'badge-error', label: 'Suy dinh dưỡng' },
      SHORT: { cls: 'badge-warning', label: 'Thấp' },
      TALL: { cls: 'badge-success', label: 'Cao' },
    }
    return map[status] || null
  }

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ padding: '24px 16px' }}>
          <div className="skeleton" style={{ height: 28, width: '60%', borderRadius: 8, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 18, width: '40%', borderRadius: 8, marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 120, borderRadius: 16, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 200, borderRadius: 16, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 160, borderRadius: 16, marginBottom: 16 }} />
        </div>
        <Navbar />
      </div>
    )
  }

  const {
    babyNickname = 'Bé yêu',
    babyAgeText = '',
    babyAgeDays = 0,
    streak = 0,
    growthReminder = null,
    todayRoutines = [],
    upcomingVaccinations = [],
    todayCareTips = [],
    latestPosts = [],
  } = data || {}

  return (
    <div className="page-container">
      <div style={{ paddingBottom: 96 }}>

        {/* ── Greeting ── */}
        <div className="anim-fade" style={{ padding: '28px 20px 0' }}>
          <p className="text-hint" style={{ marginBottom: 4 }}>
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-page-title" style={{ marginBottom: 2 }}>
            Xin chào {babyNickname}! 👋
          </h1>
          {babyAgeText ? (
            <p className="text-desc" style={{ color: '#FF5C8A', fontWeight: 600 }}>
              {babyAgeText} tuổi · {babyAgeDays} ngày
            </p>
          ) : null}
        </div>

        {/* ── Streak Card ── */}
        <div style={{ padding: '16px 20px 0' }} className="anim-slide">
          <div className="card card-pink" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '18px 20px',
            background: 'linear-gradient(135deg, #FF5C8A 0%, #FF8FAB 100%)',
            border: 'none',
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}>
              🔥
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 2 }}>
                Chuỗi ngày ghi nhật ký
              </p>
              <p style={{ color: '#fff', fontSize: 28, fontWeight: 800, lineHeight: 1 }}>
                {streak} <span style={{ fontSize: 15, fontWeight: 500 }}>ngày liên tiếp</span>
              </p>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              {streak > 0 ? '⭐ Tuyệt vời!' : 'Bắt đầu hôm nay!'}
            </div>
          </div>
        </div>

        {/* ── Today's Routines ── */}
        <div style={{ padding: '20px 20px 0' }}>
          <div className="section-header">
            <h2 className="section-title">Lịch hôm nay</h2>
            <Link to="/routines" className="section-link">Xem tất cả</Link>
          </div>

          {todayRoutines.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-emoji">📅</div>
              <p className="empty-state-title">Không có lịch hôm nay</p>
              <p className="empty-state-desc">Thêm lịch sinh hoạt để theo dõi bé yêu nhé!</p>
              <Link to="/routines" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                Thêm lịch
              </Link>
            </div>
          ) : (
            <div className="card" style={{ padding: '8px 0' }}>
              {todayRoutines.map((routine, idx) => {
                const isDone = loggedIds.includes(routine.id) || routine.logged
                const emoji = ACTIVITY_EMOJI[routine.type] || '📌'
                const iconCls = ACTIVITY_ICON_CLASS[routine.type] || 'activity-icon-orange'
                return (
                  <div key={routine.id} className="activity-row" style={{
                    borderBottom: idx < todayRoutines.length - 1 ? '1px solid #FFF0F5' : 'none',
                  }}>
                    <div className={`activity-icon ${iconCls}`}>{emoji}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: '#2D2D2D', marginBottom: 2 }}>
                        {routine.name}
                      </p>
                      <p className="text-hint">
                        {routine.scheduledTime || 'Cả ngày'}
                        {routine.note ? ` · ${routine.note}` : ''}
                      </p>
                    </div>
                    <button
                      className={`btn btn-sm ${isDone ? 'btn-icon' : 'btn-primary'}`}
                      style={isDone ? { background: '#E8F5E9', color: '#43A047', border: 'none' } : {}}
                      onClick={() => !isDone && handleLog(routine)}
                      disabled={isDone || loggingId === routine.id}
                    >
                      {loggingId === routine.id ? '...' : isDone ? '✓ Xong' : 'Ghi lại'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Growth Reminder ── */}
        {growthReminder && (
          <div style={{ padding: '20px 20px 0' }}>
            <div className="card card-warning" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 32 }}>📏</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#7C4D00', marginBottom: 2 }}>
                  Nhắc nhở cân đo
                </p>
                <p className="text-small" style={{ color: '#9A6000' }}>{growthReminder}</p>
              </div>
              <Link to="/growth" className="btn btn-sm" style={{
                background: '#FFF3CD',
                color: '#7C4D00',
                border: '1px solid #FFD54F',
                borderRadius: 10,
              }}>
                Đo ngay
              </Link>
            </div>
          </div>
        )}

        {/* ── Upcoming Vaccinations ── */}
        <div style={{ padding: '20px 20px 0' }}>
          <div className="section-header">
            <h2 className="section-title">Tiêm chủng sắp tới</h2>
            <Link to="/vaccination" className="section-link">Xem tất cả</Link>
          </div>

          {upcomingVaccinations.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-emoji">💉</div>
              <p className="empty-state-title">Không có lịch tiêm sắp tới</p>
              <p className="empty-state-desc">Bé đã được tiêm chủng đầy đủ!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingVaccinations.slice(0, 3).map(vacc => (
                <div key={vacc.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: '#FFF0F5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                  }}>
                    💉
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: '#2D2D2D', marginBottom: 2 }}>
                      {vacc.vaccineName}
                    </p>
                    <p className="text-hint">
                      {vacc.scheduledDate
                        ? new Date(vacc.scheduledDate).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })
                        : 'Chưa xác định'}
                    </p>
                  </div>
                  <span className={`badge ${vacc.daysUntil <= 3 ? 'badge-pink' : 'badge-warning'}`}>
                    {vacc.daysUntil === 0 ? 'Hôm nay' : vacc.daysUntil === 1 ? 'Ngày mai' : `${vacc.daysUntil} ngày`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Care Tips ── */}
        {todayCareTips && todayCareTips.length > 0 && (
          <div style={{ padding: '20px 20px 0' }}>
            <div className="section-header">
              <h2 className="section-title">Mẹo chăm sóc hôm nay</h2>
            </div>
            <div className="scroll-x" style={{ gap: 12, paddingBottom: 8 }}>
              {todayCareTips.map((tip, idx) => (
                <div key={idx} className="card card-pale" style={{
                  minWidth: 220,
                  maxWidth: 240,
                  flexShrink: 0,
                  padding: '16px',
                }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{tip.emoji || '💡'}</div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#2D2D2D', marginBottom: 4 }}>{tip.title}</p>
                  <p className="text-hint" style={{ fontSize: 12, lineHeight: 1.5 }}>{tip.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Latest Photos ── */}
        {latestPosts && latestPosts.length > 0 && (
          <div style={{ padding: '20px 20px 0' }}>
            <div className="section-header">
              <h2 className="section-title">Kỷ niệm gần đây</h2>
              <Link to="/diary" className="section-link">Xem tất cả</Link>
            </div>
            <div className="scroll-x" style={{ gap: 10, paddingBottom: 8 }}>
              {latestPosts.map(post => (
                <div key={post.id} style={{
                  width: 140,
                  height: 140,
                  borderRadius: 16,
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: '#FFF0F5',
                  position: 'relative',
                }}>
                  {post.imageUrl ? (
                    <img src={post.imageUrl} alt={post.title || 'Kỷ niệm'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexDirection: 'column', gap: 6,
                    }}>
                      <Camera size={28} color="#FF5C8A" />
                      <p style={{ fontSize: 11, color: '#FF5C8A', textAlign: 'center', padding: '0 8px' }}>
                        {post.title || 'Kỷ niệm'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Quick Nav Grid ── */}
        <div style={{ padding: '20px 20px 0' }}>
          <h2 className="section-title" style={{ marginBottom: 12 }}>Truy cập nhanh</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}>
            {[
              { to: '/growth', icon: '📏', label: 'Tăng trưởng', color: '#E8F5E9', iconBg: '#43A047' },
              { to: '/vaccination', icon: '💉', label: 'Tiêm chủng', color: '#E3F2FD', iconBg: '#1976D2' },
              { to: '/routines', icon: '📅', label: 'Lịch sinh hoạt', color: '#FFF8E1', iconBg: '#F9A825' },
              { to: '/premium', icon: '⭐', label: 'Premium', color: '#FFF0F5', iconBg: '#FF5C8A' },
            ].map(item => (
              <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
                <div className="card" style={{
                  background: item.color,
                  border: 'none',
                  padding: '18px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}>
                    {item.icon}
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#2D2D2D' }}>{item.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>

      <Navbar />
    </div>
  )
}
