import { useState, useEffect, useCallback } from 'react'
import { CheckCheck } from 'lucide-react'
import Navbar from '../components/Navbar'
import { notificationApi } from '../api/api'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

// -------------------------------------------------------
// Type config
// -------------------------------------------------------
const TYPE_CONFIG = {
  VACCINATION:     { emoji: '💉', bg: 'var(--c-primary-light)', color: 'var(--c-primary)' },
  GROWTH_REMINDER: { emoji: '📏', bg: 'var(--c-success-bg)',    color: 'var(--c-success)' },
  NEW_POST:        { emoji: '📸', bg: '#EBF4FF',                color: '#1D6FA4' },
  ROUTINE:         { emoji: '⏰', bg: 'var(--c-warning-bg)',    color: 'var(--c-warning)' },
  STREAK:          { emoji: '🔥', bg: 'var(--c-primary-light)', color: 'var(--c-primary)' },
  MILESTONE:       { emoji: '🎉', bg: '#F0EBFF',               color: '#7C3AED' },
}

function getTypeConfig(type) {
  return TYPE_CONFIG[type] || { emoji: '🔔', bg: '#F3F4F6', color: '#6B7280' }
}

// -------------------------------------------------------
// Helper: format time
// -------------------------------------------------------
function timeAgo(dateStr) {
  if (!dateStr) return ''
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi })
  } catch {
    return ''
  }
}

// -------------------------------------------------------
// NotificationItem
// -------------------------------------------------------
function NotificationItem({ notification, onMarkRead }) {
  const cfg = getTypeConfig(notification.type)
  const unread = !notification.read

  return (
    <button
      style={{
        ...itemStyles.wrapper,
        background: unread ? '#FFFBFD' : '#FFFFFF',
        borderLeft: unread ? '3px solid #E91E8C' : '3px solid transparent',
      }}
      onClick={() => !notification.read && onMarkRead(notification.id)}
    >
      {/* Icon */}
      <div style={{ ...itemStyles.iconBox, background: cfg.bg }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{cfg.emoji}</span>
      </div>

      {/* Content */}
      <div style={itemStyles.content}>
        <p style={{ ...itemStyles.message, fontWeight: unread ? 700 : 400 }}>
          {notification.message || notification.title || 'Thông báo mới'}
        </p>
        <span style={itemStyles.time}>{timeAgo(notification.createdAt)}</span>
      </div>

      {/* Unread dot */}
      {unread && <span style={itemStyles.dot} />}
    </button>
  )
}

// -------------------------------------------------------
// Main Page
// -------------------------------------------------------
export default function NotificationsPage() {
  const [items,       setItems]       = useState([])
  const [page,        setPage]        = useState(0)
  const [totalPages,  setTotalPages]  = useState(1)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading,     setLoading]     = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error,       setError]       = useState('')

  // -------------------------------------------------------
  const fetchPage = useCallback(async (pageNum, replace = false) => {
    if (pageNum === 0) setLoading(true)
    else               setLoadingMore(true)
    setError('')

    try {
      const data = await notificationApi.list(pageNum)
      const newItems = data.content || []
      setItems((prev) => replace ? newItems : [...prev, ...newItems])
      setTotalPages(data.totalPages ?? 1)
      setUnreadCount(data.unreadCount ?? 0)
    } catch (err) {
      setError('Không thể tải thông báo. Vui lòng thử lại.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    fetchPage(0, true)
  }, [fetchPage])

  // -------------------------------------------------------
  async function handleMarkRead(id) {
    try {
      await notificationApi.markRead(id)
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      // silent
    }
  }

  // -------------------------------------------------------
  async function handleMarkAllRead() {
    try {
      await notificationApi.markAllRead()
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {
      setError('Không thể đánh dấu tất cả đã đọc.')
    }
  }

  // -------------------------------------------------------
  function handleLoadMore() {
    const next = page + 1
    setPage(next)
    fetchPage(next, false)
  }

  // -------------------------------------------------------
  const hasMore = page + 1 < totalPages

  return (
    <div style={pageStyles.root}>
      <Navbar />

      <div style={pageStyles.container}>
        {/* Header */}
        <div style={pageStyles.header}>
          <div style={pageStyles.titleRow}>
            <h1 style={pageStyles.title}>Thông báo</h1>
            {unreadCount > 0 && (
              <span style={pageStyles.badge}>{unreadCount}</span>
            )}
          </div>

          {unreadCount > 0 && (
            <button style={pageStyles.markAllBtn} onClick={handleMarkAllRead}>
              <CheckCheck size={15} style={{ marginRight: 6 }} />
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>

        {/* Error */}
        {error && <div style={pageStyles.errorBox}>{error}</div>}

        {/* Loading skeleton */}
        {loading && (
          <div style={pageStyles.list}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={pageStyles.skeleton} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && !error && (
          <div style={pageStyles.empty}>
            <span style={{ fontSize: 56 }}>🔔</span>
            <p style={pageStyles.emptyTitle}>Chưa có thông báo nào</p>
            <p style={pageStyles.emptySubtitle}>
              Các thông báo về bé yêu sẽ hiển thị ở đây.
            </p>
          </div>
        )}

        {/* List */}
        {!loading && items.length > 0 && (
          <div style={pageStyles.list}>
            {items.map((notif) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div style={pageStyles.loadMoreRow}>
            <button
              style={pageStyles.loadMoreBtn}
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Đang tải...' : 'Xem thêm'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// -------------------------------------------------------
// Item styles
// -------------------------------------------------------
const itemStyles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    padding: '14px 16px',
    border: 'none',
    borderBottom: '1px solid #F3F4F6',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s',
    position: 'relative',
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  },
  message: {
    margin: 0,
    fontSize: 14,
    color: '#1A1A2E',
    lineHeight: 1.4,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#E91E8C',
    flexShrink: 0,
  },
}

// -------------------------------------------------------
// Page styles
// -------------------------------------------------------
const pageStyles = {
  root: {
    minHeight: '100vh',
    background: '#F8F9FA',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  container: {
    maxWidth: 640,
    margin: '0 auto',
    paddingBottom: 40,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 20px 16px',
    background: '#FFFFFF',
    borderBottom: '1px solid #F3F4F6',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: '#1A1A2E',
  },
  badge: {
    background: '#E91E8C',
    color: '#FFFFFF',
    borderRadius: 20,
    padding: '2px 9px',
    fontSize: 12,
    fontWeight: 700,
    minWidth: 24,
    textAlign: 'center',
  },
  markAllBtn: {
    display: 'flex',
    alignItems: 'center',
    background: '#F3F4F6',
    border: 'none',
    borderRadius: 8,
    padding: '7px 12px',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  errorBox: {
    margin: '16px 20px',
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    color: '#DC2626',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 13,
  },
  list: {
    background: '#FFFFFF',
    borderRadius: 14,
    margin: '16px 16px 0',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  skeleton: {
    height: 74,
    background: 'linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    borderBottom: '1px solid #F9FAFB',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    gap: 12,
    textAlign: 'center',
  },
  emptyTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    color: '#1A1A2E',
  },
  emptySubtitle: {
    margin: 0,
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 1.6,
  },
  loadMoreRow: {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 0',
  },
  loadMoreBtn: {
    background: 'transparent',
    border: '1.5px solid #E91E8C',
    color: '#E91E8C',
    borderRadius: 10,
    padding: '10px 28px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
}
