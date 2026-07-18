import { useCallback, useRef, useState } from 'react'
import { Heart, MessageCircle, Play, Send, Trash2, Sparkles } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { mediaApi } from '../api/api'

function normalizeMediaUrl(url, fallback) {
  if (!url) return fallback
  try {
    const p = new URL(url)
    if (p.hostname === 'localhost' || p.hostname === '127.0.0.1' || p.hostname.startsWith('192.168.'))
      return `${p.pathname}${p.search}`
    return url
  } catch { return url }
}

function normalizeUrl(url) {
  if (!url) return null
  try {
    const p = new URL(url)
    if (p.hostname === 'localhost' || p.hostname === '127.0.0.1' || p.hostname.startsWith('192.168.'))
      return `${p.pathname}${p.search}`
    return url
  } catch { return url }
}

function Avatar({ name, src, size = 36 }) {
  const [imgErr, setImgErr] = useState(false)
  const colors = ['#FF5C8A','#FF8FAB','#E91E8C','#C2185B','#FF6B9D']
  const bg = colors[(name?.charCodeAt(0) || 65) % colors.length]
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const avatarSrc = normalizeUrl(src)
  const showImg = avatarSrc && !imgErr
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: showImg ? 'transparent' : bg,
      flexShrink: 0, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: '#fff', fontFamily: 'Poppins,sans-serif',
      border: showImg ? '2px solid #F5E6EC' : 'none',
      boxSizing: 'border-box',
    }}>
      {showImg
        ? <img src={avatarSrc} alt={name} onError={() => setImgErr(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials
      }
    </div>
  )
}

export default function MediaCard({ post, index = 0, currentUserId }) {
  const [liked, setLiked]               = useState(post.reacted || false)
  const [reactionCount, setReactionCount] = useState(post.reactionCount || 0)
  const [commentCount, setCommentCount] = useState(post.commentCount || 0)
  const [imageLoaded, setImageLoaded]   = useState(false)
  const [imageError, setImageError]     = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments]         = useState([])
  const [loadingCmt, setLoadingCmt]     = useState(false)
  const [commentText, setCommentText]   = useState('')
  const [posting, setPosting]           = useState(false)
  const [bounce, setBounce]             = useState(false)
  const inputRef = useRef(null)

  const fallback = `https://picsum.photos/seed/${post.id}/600/400`
  const isVideo  = post.mediaType === 'VIDEO'
  const imgSrc   = imageError ? fallback : normalizeMediaUrl(post.mediaUrl, fallback)
  const timeAgo  = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi })
  const firstName = (post.uploadedByName || 'Gia đình').split(' ').slice(-1)[0]

  const handleLike = async () => {
    setBounce(true); setTimeout(() => setBounce(false), 400)
    const next = !liked
    setLiked(next); setReactionCount(c => next ? c + 1 : Math.max(0, c - 1))
    try {
      const res = await mediaApi.react(post.id)
      if (res.data) {
        setLiked(Boolean(res.data.reacted))
        setReactionCount(Number(res.data.reactionCount) || 0)
      }
    } catch {
      setLiked(!next); setReactionCount(c => next ? c - 1 : c + 1)
    }
  }

  const loadComments = useCallback(async () => {
    if (loadingCmt) return
    setLoadingCmt(true)
    try {
      const res = await mediaApi.getComments(post.id)
      setComments(Array.isArray(res.data) ? res.data : res.data?.content ?? [])
    } catch { /* silent */ } finally { setLoadingCmt(false) }
  }, [post.id, loadingCmt])

  const toggleComments = () => {
    if (!showComments) loadComments()
    setShowComments(v => !v)
    if (!showComments) setTimeout(() => inputRef.current?.focus(), 300)
  }

  const postComment = async () => {
    if (!commentText.trim() || posting) return
    const text = commentText.trim()
    setPosting(true); setCommentText('')
    try {
      const res = await mediaApi.postComment(post.id, text)
      setComments(prev => [...prev, res.data])
      setCommentCount(c => c + 1)
    } catch { setCommentText(text) } finally { setPosting(false) }
  }

  const deleteComment = async (id) => {
    try {
      await mediaApi.deleteComment(post.id, id)
      setComments(p => p.filter(c => c.id !== id))
      setCommentCount(c => Math.max(0, c - 1))
    }
    catch { /* silent */ }
  }

  return (
    <article style={{
      background: '#fff', borderRadius: 24, overflow: 'hidden',
      border: '1px solid #F5E6EC',
      boxShadow: '0 4px 20px rgba(255,92,138,0.07)',
      animation: 'cardIn 0.45s ease both',
      animationDelay: `${index * 80}ms`,
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 10px' }}>
        <Avatar name={post.uploadedByName} src={post.uploadedByAvatar} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>
            {post.uploadedByName || 'Gia đình'}
          </p>
          <p style={{ fontSize: 11, color: '#AAAAAA', margin: 0, marginTop: 1 }}>{timeAgo}</p>
        </div>
        {isVideo && (
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
            background: 'var(--c-primary)', color: '#fff',
            padding: '3px 10px', borderRadius: 999,
          }}>VIDEO</span>
        )}
      </div>

      {/* ── Media ── */}
      <div style={{ position: 'relative', aspectRatio: '4/3', background: '#F8EEF3', overflow: 'hidden' }}>
        {!imageLoaded && <div className="skeleton" style={{ position: 'absolute', inset: 0 }} />}

        {isVideo ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img src={imgSrc} alt="Video"
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.4s' }}
              onLoad={() => setImageLoaded(true)}
              onError={() => { setImageError(true); setImageLoaded(true) }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg,rgba(0,0,0,0.04) 0%,rgba(0,0,0,0.28) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              }}>
                <Play size={26} style={{ color: 'var(--c-primary)', fill: 'var(--c-primary)', marginLeft: 3 }} />
              </div>
            </div>
          </div>
        ) : (
          <img src={imgSrc} alt={post.caption || 'Khoảnh khắc'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.5s' }}
            onLoad={() => setImageLoaded(true)}
            onError={() => { setImageError(true); setImageLoaded(true) }}
          />
        )}

        {/* bottom gradient */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 64,
          background: 'linear-gradient(0deg,rgba(0,0,0,0.15) 0%,transparent 100%)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* ── Actions ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        padding: '10px 12px 8px',
      }}>
        {/* Like */}
        <button onClick={handleLike} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: liked ? '#FFF0F5' : 'transparent',
          border: 'none', borderRadius: 999, padding: '8px 14px',
          cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
          transition: 'background 0.18s',
        }}>
          <Heart size={20}
            fill={liked ? 'var(--c-primary)' : 'none'}
            stroke={liked ? 'var(--c-primary)' : '#BBBBBB'}
            style={{
              transition: 'transform 0.3s cubic-bezier(.34,1.56,.64,1)',
              transform: bounce ? 'scale(1.45)' : 'scale(1)',
            }}
          />
          {reactionCount > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: liked ? 'var(--c-primary)' : '#BBBBBB' }}>
              {reactionCount}
            </span>
          )}
        </button>

        {/* Comment */}
        <button onClick={toggleComments} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: showComments ? '#F0EEFF' : 'transparent',
          border: 'none', borderRadius: 999, padding: '8px 14px',
          cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
          transition: 'background 0.18s',
        }}>
          <MessageCircle size={20} stroke={showComments ? '#7C3AED' : '#BBBBBB'} />
          {(commentCount > 0 || comments.length > 0) && (
            <span style={{ fontSize: 13, fontWeight: 700, color: showComments ? '#7C3AED' : '#BBBBBB' }}>
              {Math.max(commentCount, comments.length)}
            </span>
          )}
        </button>

        <div style={{ flex: 1 }} />

        {post.aiCaptions?.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'linear-gradient(135deg,#FFF5FB,#F3EEFF)',
            borderRadius: 999, padding: '4px 10px', border: '1px solid #FFD6E4',
          }}>
            <Sparkles size={11} color="var(--c-primary)" />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-primary)' }}>AI</span>
          </div>
        )}
      </div>

      {/* ── Caption ── */}
      {(post.caption || post.aiCaptions?.length > 0) && (
        <div style={{ padding: '2px 16px 14px' }}>
          {post.caption && (
            <p style={{ fontSize: 14, color: '#333', lineHeight: 1.65, margin: 0 }}>
              <span style={{ fontWeight: 700, marginRight: 5, color: '#1A1A2E' }}>{firstName}</span>
              {post.caption}
            </p>
          )}
          {post.aiCaptions?.length > 0 && (
            <div style={{
              marginTop: 10, padding: '10px 14px',
              background: 'linear-gradient(135deg,#FFF8FC,#F8F3FF)',
              borderRadius: 14, border: '1px dashed #FFB3D1',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                <Sparkles size={12} color="var(--c-primary)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-primary)' }}>AI gợi ý caption</span>
              </div>
              {post.aiCaptions.map((cap, i) => (
                <p key={i} style={{ fontSize: 13, color: '#666', margin: '2px 0', lineHeight: 1.5, fontStyle: 'italic' }}>
                  &ldquo;{cap}&rdquo;
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Comments panel ── */}
      {showComments && (
        <div style={{ borderTop: '1px solid #F5E6EC', background: '#FAFAFA' }}>
          {/* list */}
          <div style={{ maxHeight: 200, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loadingCmt ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1,2].map(i => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                    <div className="skeleton" style={{ flex: 1, height: 34, borderRadius: 10 }} />
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <p style={{ fontSize: 12, color: '#AAAAAA', textAlign: 'center', padding: '6px 0' }}>
                Chưa có bình luận nào. Hãy viết điều gì đó!
              </p>
            ) : (
              comments.map(cmt => (
                <div key={cmt.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Avatar name={cmt.userName} size={28} />
                  <div style={{
                    flex: 1, background: '#fff', borderRadius: 14,
                    padding: '7px 12px', border: '1px solid #F0E8F0',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A2E' }}>{cmt.userName}</span>
                      <span style={{ fontSize: 10, color: '#BBBBBB' }}>
                        {formatDistanceToNow(new Date(cmt.createdAt), { addSuffix: true, locale: vi })}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: '#555', margin: 0, lineHeight: 1.5 }}>{cmt.content}</p>
                  </div>
                  {cmt.userId === currentUserId && (
                    <button onClick={() => deleteComment(cmt.id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '6px 4px', color: '#DDD', display: 'flex', alignItems: 'center',
                    }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* input */}
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center',
            padding: '8px 12px 12px', borderTop: '1px solid #F5E6EC',
          }}>
            <input
              ref={inputRef}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postComment()}
              placeholder="Viết bình luận..."
              style={{
                flex: 1, height: 38, borderRadius: 999, border: '1.5px solid #F0E8F0',
                padding: '0 14px', fontSize: 13, fontFamily: 'Poppins,sans-serif',
                outline: 'none', background: '#fff', color: '#333',
                transition: 'border-color 0.18s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--c-primary)'}
              onBlur={e => e.target.style.borderColor = '#F0E8F0'}
            />
            <button
              onClick={postComment}
              disabled={!commentText.trim() || posting}
              style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: commentText.trim() ? 'var(--c-primary)' : '#EEE',
                border: 'none', cursor: commentText.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.18s',
              }}
            >
              <Send size={15} color={commentText.trim() ? '#fff' : '#BBB'} style={{ marginLeft: 2 }} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </article>
  )
}
