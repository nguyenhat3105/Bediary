import { useState } from 'react'
import { Heart, MessageCircle, Play } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { mediaApi } from '../api/api'

export default function MediaCard({ post, index = 0 }) {
  const [liked, setLiked] = useState(post.reacted || false)
  const [reactionCount, setReactionCount] = useState(post.reactionCount || 0)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true, locale: vi,
  })

  const isVideo = post.mediaType === 'VIDEO'
  const imgSrc = imageError ? `https://picsum.photos/seed/${post.id}/600/400` : (post.mediaUrl || `https://picsum.photos/seed/${post.id}/600/400`)

  const handleLike = async () => {
    try {
      await mediaApi.react(post.id)
      const nowLiked = !liked
      setLiked(nowLiked)
      setReactionCount(c => nowLiked ? c + 1 : Math.max(0, c - 1))
    } catch {
      // silent
    }
  }

  const initials = post.uploadedByName?.charAt(0)?.toUpperCase() || '?'

  return (
    <article
      className="media-card anim-slide"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both', opacity: 0 }}
    >
      {/* Media */}
      <div style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--c-surface-2)', overflow: 'hidden' }}>
        {!imageLoaded && (
          <div className="skeleton" style={{ position: 'absolute', inset: 0 }} />
        )}
        {isVideo ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img src={imgSrc} alt="Video thumbnail"
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.4s' }}
              onLoad={() => setImageLoaded(true)} onError={() => { setImageError(true); setImageLoaded(true) }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
                <Play size={22} style={{ color: 'var(--c-primary)', fill: 'var(--c-primary)', marginLeft: 3 }} />
              </div>
            </div>
          </div>
        ) : (
          <img src={imgSrc} alt={post.caption || 'Khoảnh khắc của bé'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.5s' }}
            onLoad={() => setImageLoaded(true)} onError={() => { setImageError(true); setImageLoaded(true) }} />
        )}

        {/* Time badge */}
        <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.92)', borderRadius: 20, padding: '4px 10px', fontSize: 11, color: 'var(--c-text-2)', fontWeight: 500, backdropFilter: 'blur(8px)' }}>
          {timeAgo}
        </div>
      </div>

      {/* Body */}
      <div className="media-card-body">
        {/* Author row */}
        <div className="flex items-center gap-3" style={{ marginBottom: post.caption ? 10 : 0 }}>
          <div className="avatar avatar-sm flex items-center justify-center" style={{ background: 'var(--c-primary-light)', fontSize: 14, fontWeight: 700, color: 'var(--c-primary)' }}>
            {initials}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-1)' }}>{post.uploadedByName || 'Gia đình'}</p>
          </div>
        </div>

        {post.caption && (
          <p style={{ fontSize: 14, color: 'var(--c-text-2)', lineHeight: 1.6, marginTop: 8 }}>{post.caption}</p>
        )}

        {/* AI Captions */}
        {post.aiCaptions?.length > 0 && (
          <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--c-primary-pale)', borderRadius: 12, border: '1px solid #FFD6E4' }}>
            <p style={{ fontSize: 12, color: 'var(--c-primary)', fontWeight: 600, marginBottom: 4 }}>✨ AI gợi ý caption</p>
            {post.aiCaptions.map((c, i) => (
              <p key={i} style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 2 }}>"{c}"</p>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="media-card-actions">
        <button
          id={`like-${post.id}`}
          onClick={handleLike}
          className={`react-btn${liked ? ' active' : ''}`}
        >
          <Heart size={18} fill={liked ? 'var(--c-primary)' : 'none'} style={{ transition: 'transform 0.2s', transform: liked ? 'scale(1.15)' : 'scale(1)' }} />
          <span>{reactionCount > 0 ? reactionCount : ''} Yêu thích</span>
        </button>

        <button id={`comment-${post.id}`} className="react-btn" style={{ marginLeft: 'auto' }}>
          <MessageCircle size={18} />
          <span>{post.commentCount > 0 ? post.commentCount : ''} Bình luận</span>
        </button>
      </div>
    </article>
  )
}
