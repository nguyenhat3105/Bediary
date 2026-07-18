import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Calendar, HeartPulse, Home, Syringe, TrendingUp } from 'lucide-react'
import { notificationApi } from '../api/api'
import { useRole } from '../hooks/useRole'

const NAV_ITEMS = [
  { path: '/', Icon: Home, label: 'Trang chủ' },
  { path: '/tracking', Icon: Calendar, label: 'Nhật ký' },
  { path: '/growth', Icon: TrendingUp, label: 'Tăng trưởng' },
  { path: '/vaccinations', Icon: Syringe, label: 'Tiêm chủng' },
  { path: '/health', Icon: HeartPulse, label: 'Sổ sức khỏe' },
]

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('bediary_user') || '{}')
  } catch {
    return {}
  }
}

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)
  const intervalRef = useRef(null)

  const fetchUnread = async () => {
    try {
      const response = await notificationApi.unreadCount()
      setUnreadCount(response.data?.count ?? response.data?.unreadCount ?? 0)
    } catch {
      /* ignore notification polling errors */
    }
  }

  useEffect(() => {
    fetchUnread()
    intervalRef.current = window.setInterval(fetchUnread, 60000)
    return () => window.clearInterval(intervalRef.current)
  }, [])

  const user = getUser()
  const { label, emoji, badgeStyle } = useRole()
  const initials = (user.fullName || user.name || '?')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const isProfileActive = location.pathname === '/profile'

  return (
    <>
      <nav className="top-nav">
        <button
          className="nav-icon-btn"
          aria-label="Hồ sơ"
          onClick={() => navigate('/profile')}
          style={{ position: 'relative' }}
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="avatar"
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                objectFit: 'cover',
                border: isProfileActive ? '2px solid var(--c-primary)' : '2px solid transparent',
              }}
            />
          ) : (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: isProfileActive ? 'var(--c-primary)' : 'var(--c-primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: isProfileActive ? '#fff' : 'var(--c-primary)',
                border: isProfileActive ? '2px solid var(--c-primary)' : '2px solid var(--c-primary-light)',
              }}
            >
              {initials}
            </div>
          )}
        </button>

        <span className="top-nav-logo">Bediary</span>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            borderRadius: 999,
            padding: '3px 9px',
            fontSize: 11,
            fontWeight: 700,
            ...badgeStyle,
          }}
        >
          <span>{emoji}</span>
          <span>{label}</span>
        </div>

        <button className="nav-icon-btn" aria-label="Thông báo" onClick={() => navigate('/notifications')}>
          <Bell size={20} />
          {unreadCount > 0 && <span className="notif-dot" />}
        </button>
      </nav>

      <nav className="bottom-nav">
        {NAV_ITEMS.map(({ path, Icon, label }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
          return (
            <Link key={path} to={path} className={`bottom-nav-item${isActive ? ' active' : ''}`}>
              <Icon size={21} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
