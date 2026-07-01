import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Calendar, Home, Image, Menu, Sparkles, TrendingUp } from 'lucide-react'
import { notificationApi } from '../api/api'

const NAV_ITEMS = [
  { path: '/', Icon: Home, label: 'Trang chủ' },
  { path: '/tracking', Icon: Calendar, label: 'Nhật ký' },
  { path: '/growth', Icon: TrendingUp, label: 'Tăng trưởng' },
  { path: '/feed', Icon: Image, label: 'Album' },
  { path: '/ai', Icon: Sparkles, label: 'AI' },
]

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

  return (
    <>
      <nav className="top-nav">
        <button className="nav-icon-btn" aria-label="Menu">
          <Menu size={20} />
        </button>

        <span className="top-nav-logo">Bediary</span>

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
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
