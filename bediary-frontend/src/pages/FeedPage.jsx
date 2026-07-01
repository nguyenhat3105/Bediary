import { useState, useEffect, useCallback, useRef } from 'react'
import { Camera, RefreshCw, Upload, X } from 'lucide-react'
import Navbar from '../components/Navbar'
import MediaCard from '../components/MediaCard'
import { mediaApi } from '../api/api'

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(0)
  const [hasNext, setHasNext] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadCaption, setUploadCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const sentinelRef = useRef(null)
  const observerRef = useRef(null)
  const fileRef = useRef(null)

  const loadPosts = useCallback(async (pageNum = 0, append = false) => {
    if (pageNum === 0) setLoading(true)
    else setLoadingMore(true)
    try {
      const res = await mediaApi.feed(pageNum, 10)
      const { content, hasNext: hn } = res.data
      setPosts(prev => append ? [...prev, ...content] : content)
      setHasNext(hn)
      setPage(pageNum)
    } catch {
      setError('Không thể tải ảnh. Vui lòng thử lại.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => { loadPosts(0) }, [loadPosts])

  useEffect(() => {
    if (!sentinelRef.current) return
    observerRef.current = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNext && !loadingMore && !loading) loadPosts(page + 1, true) },
      { threshold: 0.1 }
    )
    observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
  }, [hasNext, loadingMore, loading, page, loadPosts])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFile(file)
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  const handleUpload = async () => {
    if (!uploadFile) return
    setUploading(true)
    try {
      await mediaApi.upload(uploadFile, uploadCaption)
      setShowUpload(false)
      setUploadFile(null)
      setUploadCaption('')
      setPreview(null)
      loadPosts(0)
    } catch (err) {
      alert(err.response?.data?.message || 'Upload thất bại')
    } finally {
      setUploading(false)
    }
  }

  const closeUpload = () => {
    setShowUpload(false)
    setUploadFile(null)
    setUploadCaption('')
    setPreview(null)
  }

  return (
    <div style={{ background: 'var(--c-bg)', minHeight: '100vh' }}>
      <Navbar />
      <main className="page-container">
        {/* Header */}
        <div className="flex items-center justify-between anim-fade" style={{ marginBottom: 20 }}>
          <div>
            <h1 className="text-page-title">Album 📷</h1>
            <p className="text-desc" style={{ marginTop: 4 }}>Những kỷ niệm quý giá của gia đình</p>
          </div>
          <div className="flex gap-2">
            <button id="feed-refresh" onClick={() => loadPosts(0)} className="btn-icon">
              <RefreshCw size={18} style={{ color: loading ? 'var(--c-primary)' : 'var(--c-text-2)', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button id="feed-upload" onClick={() => setShowUpload(true)} className="btn btn-primary btn-sm">
              <Camera size={16} /> Đăng ảnh
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--c-error-bg)', color: 'var(--c-error)', fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Skeletons */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="media-card">
                <div className="skeleton" style={{ aspectRatio: '4/3' }} />
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 8 }} />
                  <div className="skeleton" style={{ height: 12, width: '40%', borderRadius: 8 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Posts */}
        {!loading && posts.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-emoji">📸</div>
            <p className="empty-state-title">Chưa có khoảnh khắc nào</p>
            <p className="empty-state-desc">Bắt đầu chia sẻ những khoảnh khắc đáng yêu của bé với gia đình nhé!</p>
            <button onClick={() => setShowUpload(true)} className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
              <Camera size={16} /> Đăng ảnh đầu tiên
            </button>
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {posts.map((post, i) => <MediaCard key={post.id} post={post} index={i} />)}
          </div>
        )}

        {/* Sentinel */}
        <div ref={sentinelRef} style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
          {loadingMore && <div style={{ width: 20, height: 20, border: '2px solid var(--c-primary-light)', borderTopColor: 'var(--c-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
          {!hasNext && posts.length > 0 && <p style={{ fontSize: 12, color: 'var(--c-text-hint)' }}>— Đã xem hết —</p>}
        </div>
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeUpload()}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
              <h3 className="text-card-title">📤 Đăng ảnh/video</h3>
              <button onClick={closeUpload} className="btn-icon"><X size={18} /></button>
            </div>

            {/* File picker */}
            {!preview ? (
              <div
                onClick={() => fileRef.current?.click()}
                style={{ aspectRatio: '4/3', borderRadius: 16, border: '2px dashed var(--c-primary)', background: 'var(--c-primary-pale)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer' }}
              >
                <div style={{ fontSize: 48 }}>🖼️</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-primary)' }}>Chọn ảnh hoặc video</p>
                <p style={{ fontSize: 12, color: 'var(--c-text-hint)' }}>JPG, PNG, MP4 · Tối đa 50MB</p>
              </div>
            ) : (
              <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '4/3' }}>
                <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="preview" />
                <button onClick={() => { setPreview(null); setUploadFile(null) }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                  <X size={16} />
                </button>
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileSelect} />

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="input-label">Thêm caption (tùy chọn)</label>
              <textarea
                value={uploadCaption} onChange={e => setUploadCaption(e.target.value)}
                placeholder="Khoảnh khắc đáng nhớ... 💕"
                rows={3}
                style={{ width: '100%', borderRadius: 12, border: '1.5px solid var(--c-border, #F1F1F1)', padding: '12px 14px', fontSize: 14, fontFamily: 'Poppins,sans-serif', outline: 'none', resize: 'none', color: 'var(--c-text-1)', background: '#fafafa', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'var(--c-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--c-border, #F1F1F1)'}
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="btn btn-primary w-full"
              style={{ marginTop: 8, opacity: (!uploadFile || uploading) ? 0.6 : 1 }}
            >
              {uploading ? 'Đang đăng...' : <><Upload size={16} /> Đăng lên</>}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
