import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw, Upload, X, Image, Sparkles } from 'lucide-react'
import Navbar from '../components/Navbar'
import MediaCard from '../components/MediaCard'
import { mediaApi } from '../api/api'

const MAX_BYTES = 50 * 1024 * 1024

function getApiError(err, fallback) {
  const d = err.response?.data
  if (d?.message) return d.message
  if (d?.fieldErrors) return Object.entries(d.fieldErrors).map(([k, v]) => `${k}: ${v}`).join('; ')
  if (err.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (err.response?.status === 403) return 'Bạn chưa có quyền thực hiện thao tác này. Hãy đăng nhập lại hoặc kiểm tra quyền trong hồ sơ gia đình.'
  if (err.code === 'ECONNABORTED') return 'Upload quá lâu. Thử lại với ảnh nhỏ hơn hoặc kiểm tra mạng.'
  if (!err.response) return `Không nhận được phản hồi từ backend (${err.code || 'NETWORK'}). Hãy kiểm tra backend đang chạy, frontend chạy bằng --host, và điện thoại cùng Wi-Fi với laptop.`
  return fallback
}

export default function FeedPage() {
  const [posts, setPosts]           = useState([])
  const [page, setPage]             = useState(0)
  const [hasNext, setHasNext]       = useState(true)
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]           = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [caption, setCaption]       = useState('')
  const [preview, setPreview]       = useState(null)
  const [uploading, setUploading]   = useState(false)
  const [uploadErr, setUploadErr]   = useState('')
  const [dragOver, setDragOver]     = useState(false)

  const sentinelRef = useRef(null)
  const observerRef = useRef(null)
  const fileRef     = useRef(null)
  const loadingPageRef = useRef(false)

  // current user from localStorage
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('bediary_user') || '{}') } catch { return {} } })()

  const loadPosts = useCallback(async (pageNum = 0, append = false) => {
    if (loadingPageRef.current) return
    loadingPageRef.current = true
    if (pageNum === 0) setLoading(true)
    else setLoadingMore(true)
    setError('')
    try {
      const res = await mediaApi.feed(pageNum, 8)
      const { content, hasNext: next } = res.data
      setPosts(prev => append ? [...prev, ...content] : content)
      setHasNext(next)
      setPage(pageNum)
    } catch (err) {
      setError(getApiError(err, 'Không thể tải ảnh. Vui lòng thử lại.'))
      if (append || err.response?.status === 401 || err.response?.status === 403) {
        setHasNext(false)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
      loadingPageRef.current = false
    }
  }, [])

  useEffect(() => { loadPosts(0) }, [loadPosts])

  useEffect(() => {
    if (showUpload) {
      observerRef.current?.disconnect()
      return
    }
    if (!sentinelRef.current) return
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNext && !loadingMore && !loading)
          loadPosts(page + 1, true)
      },
      { threshold: 0.1 }
    )
    observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
  }, [hasNext, loadingMore, loading, page, loadPosts, showUpload])

  const selectFile = (file) => {
    if (!file) return
    setUploadErr('')
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setUploadErr('Chỉ hỗ trợ ảnh hoặc video.'); return
    }
    if (file.size > MAX_BYTES) {
      setUploadErr('File vượt quá 50MB.'); return
    }
    setUploadFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    selectFile(e.dataTransfer.files?.[0])
  }

  const handleUpload = async () => {
    if (!uploadFile || uploading) return
    setUploading(true); setUploadErr('')
    try {
      await mediaApi.upload(uploadFile, caption)
      closeUpload()
      await loadPosts(0)
    } catch (err) {
      setUploadErr(getApiError(err, 'Upload thất bại.'))
    } finally { setUploading(false) }
  }

  const closeUpload = () => {
    setShowUpload(false); setUploadFile(null)
    setCaption(''); setPreview(null); setUploadErr('')
    setDragOver(false)
  }

  return (
    <div style={{ background: '#FFF7F9', minHeight: '100vh' }}>
      <Navbar />

      <div style={{ maxWidth: 500, margin: '0 auto', padding: '76px 16px 140px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{
              fontSize: 26, fontWeight: 800, color: '#1A1A2E', margin: 0,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 28 }}>📸</span> Album
            </h1>
            <p style={{ fontSize: 13, color: '#AAAAAA', marginTop: 4 }}>
              Những khoảnh khắc đẹp nhất của bé
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => loadPosts(0)}
              style={{
                width: 38, height: 38, borderRadius: '50%', border: 'none',
                background: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <RefreshCw size={16} color={loading ? 'var(--c-primary)' : '#AAAAAA'}
                style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button
              onClick={() => setShowUpload(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'linear-gradient(135deg,#FF5C8A,#FF8FAB)',
                border: 'none', borderRadius: 999, padding: '10px 20px',
                color: '#fff', fontSize: 14, fontWeight: 700,
                fontFamily: 'Poppins,sans-serif', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(255,92,138,0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Camera size={16} /> Đăng ảnh
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: 14, marginBottom: 18,
            background: '#FFF0F0', border: '1px solid #FFB3C6',
            fontSize: 14, color: '#C9335C', lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        {/* ── Loading skeletons ── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', border: '1px solid #F5E6EC' }}>
                <div style={{ padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="skeleton" style={{ height: 13, width: '40%', borderRadius: 8 }} />
                    <div className="skeleton" style={{ height: 10, width: '25%', borderRadius: 8 }} />
                  </div>
                </div>
                <div className="skeleton" style={{ aspectRatio: '4/3' }} />
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton" style={{ height: 12, width: '65%', borderRadius: 8 }} />
                  <div className="skeleton" style={{ height: 10, width: '40%', borderRadius: 8 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && posts.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '60px 20px', textAlign: 'center',
          }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: 'linear-gradient(135deg,#FFF0F5,#FFE4EE)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20, border: '2px dashed #FFB3CE',
            }}>
              <Image size={40} color="var(--c-primary)" strokeWidth={1.5} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', margin: '0 0 8px' }}>
              Chưa có khoảnh khắc nào
            </h3>
            <p style={{ fontSize: 14, color: '#AAAAAA', margin: '0 0 20px', lineHeight: 1.6 }}>
              Bắt đầu lưu giữ những khoảnh khắc đẹp của bé với gia đình.
            </p>
            <button
              onClick={() => setShowUpload(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg,#FF5C8A,#FF8FAB)',
                border: 'none', borderRadius: 999, padding: '12px 24px',
                color: '#fff', fontSize: 15, fontWeight: 700,
                fontFamily: 'Poppins,sans-serif', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(255,92,138,0.3)',
              }}
            >
              <Camera size={18} /> Đăng ảnh đầu tiên
            </button>
          </div>
        )}

        {/* ── Posts ── */}
        {!loading && posts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {posts.map((post, i) => (
              <MediaCard
                key={post.id}
                post={post}
                index={i}
                currentUserId={currentUser.id}
              />
            ))}
          </div>
        )}

        {/* ── Sentinel / infinite scroll ── */}
        <div ref={sentinelRef} style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
          {loadingMore && (
            <div style={{
              width: 24, height: 24, border: '2.5px solid #FFD6E4',
              borderTopColor: 'var(--c-primary)', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          )}
          {!hasNext && posts.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 40, height: 1, background: '#EEEEEE' }} />
              <span style={{ fontSize: 12, color: '#CCCCCC' }}>Đã xem hết</span>
              <div style={{ width: 40, height: 1, background: '#EEEEEE' }} />
            </div>
          )}
        </div>
      </div>

      {/* ── FAB Upload Button ── */}
      <button
        onClick={() => setShowUpload(true)}
        aria-label="Đăng ảnh mới"
        style={{
            position: 'fixed', bottom: 98, right: 20, zIndex: 40,
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg,#FF5C8A,#FF8FAB)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 24px rgba(255,92,138,0.45)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(255,92,138,0.55)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(255,92,138,0.45)' }}
      >
        <Camera size={22} color="#fff" />
      </button>

      {/* ── Upload Modal ── */}
      {showUpload && (
        <div
          onClick={e => e.target === e.currentTarget && closeUpload()}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 18,
            animation: 'overlayIn 0.2s ease',
          }}
        >
          <div style={{
            background: '#fff', borderRadius: 28, width: 'min(520px, 100%)',
            maxWidth: 520, padding: '20px 20px 24px',
            animation: 'sheetUp 0.3s cubic-bezier(.22,1,.36,1)',
            maxHeight: 'min(88vh, 760px)', overflowY: 'auto',
            boxShadow: '0 28px 90px rgba(17,24,39,.28)',
          }}>
            {/* drag handle */}
            <div style={{ width: 36, height: 4, background: '#EEEEEE', borderRadius: 999, margin: '0 auto 20px' }} />

            {/* header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1A1A2E', margin: 0 }}>
                  Đăng khoảnh khắc mới
                </h3>
                <p style={{ fontSize: 12, color: '#AAAAAA', margin: '2px 0 0' }}>JPG, PNG, MP4 · tối đa 50MB</p>
              </div>
              <button onClick={closeUpload} style={{
                width: 36, height: 36, borderRadius: '50%', background: '#F5F5F5',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={16} color="#888" />
              </button>
            </div>

            {/* drop zone */}
            {!preview ? (
              <div
                onClick={() => fileRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                style={{
                  aspectRatio: '4/3', borderRadius: 20,
                  border: `2px dashed ${dragOver ? 'var(--c-primary)' : '#FFCADA'}`,
                  background: dragOver ? '#FFF0F5' : '#FFFAFC',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 12, cursor: 'pointer',
                  transition: 'all 0.2s', marginBottom: 16,
                }}
              >
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#FFF0F5,#FFE4EE)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px dashed #FFB3CE',
                }}>
                  <Camera size={30} color="var(--c-primary)" strokeWidth={1.5} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-primary)', margin: 0 }}>
                    Chọn ảnh hoặc video
                  </p>
                  <p style={{ fontSize: 12, color: '#BBBBBB', marginTop: 4 }}>
                    Nhấn vào hoặc kéo thả file vào đây
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', aspectRatio: '4/3', marginBottom: 16 }}>
                <img src={preview} alt="preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  onClick={() => { setPreview(null); setUploadFile(null); setUploadErr('') }}
                  style={{
                    position: 'absolute', top: 10, right: 10,
                    background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
                    width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', backdropFilter: 'blur(4px)',
                  }}
                >
                  <X size={16} color="#fff" />
                </button>
                <div style={{
                  position: 'absolute', bottom: 10, left: 10, right: 10,
                  background: 'rgba(255,255,255,0.9)', borderRadius: 12,
                  padding: '6px 12px', backdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 11, color: '#666' }}>
                    {uploadFile?.name} ({(uploadFile?.size / 1024 / 1024).toFixed(1)}MB)
                  </span>
                </div>
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/*,video/*"
              style={{ display: 'none' }} onChange={e => selectFile(e.target.files?.[0])} />

            {/* caption */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>
                Caption (tùy chọn)
              </label>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Khoảnh khắc đáng nhớ..."
                rows={3}
                style={{
                  width: '100%', borderRadius: 14, border: '1.5px solid #F0E8F0',
                  padding: '12px 14px', fontSize: 14, fontFamily: 'Poppins,sans-serif',
                  outline: 'none', resize: 'none', color: '#333', background: '#FAFAFA',
                  boxSizing: 'border-box', lineHeight: 1.6, transition: 'border-color 0.18s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--c-primary)'}
                onBlur={e => e.target.style.borderColor = '#F0E8F0'}
              />
              <p style={{ fontSize: 11, color: '#CCCCCC', marginTop: 4, textAlign: 'right' }}>
                {caption.length}/500
              </p>
            </div>

            {/* AI hint */}
            <div style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              background: 'linear-gradient(135deg,#FFF8FC,#F8F3FF)',
              borderRadius: 14, padding: '10px 14px', marginBottom: 14,
              border: '1px dashed #FFB3D1',
            }}>
              <Sparkles size={14} color="var(--c-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: '#AA558A', margin: 0, lineHeight: 1.6 }}>
                Sau khi đăng, <strong>AI Caption</strong> sẽ gợi ý chú thích tự động cho ảnh của bạn.
              </p>
            </div>

            {uploadErr && (
              <div style={{
                padding: '10px 14px', borderRadius: 12, marginBottom: 12,
                background: '#FFF0F0', border: '1px solid #FFB3C6',
                fontSize: 13, color: '#C9335C', lineHeight: 1.5,
              }}>
                {uploadErr}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              style={{
                width: '100%', height: 52, borderRadius: 999,
                background: uploadFile && !uploading
                  ? 'linear-gradient(135deg,#FF5C8A,#FF8FAB)'
                  : '#EEEEEE',
                border: 'none', cursor: uploadFile && !uploading ? 'pointer' : 'not-allowed',
                color: uploadFile && !uploading ? '#fff' : '#AAAAAA',
                fontSize: 15, fontWeight: 700, fontFamily: 'Poppins,sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: uploadFile && !uploading ? '0 4px 16px rgba(255,92,138,0.35)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {uploading ? (
                <>
                  <div style={{
                    width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Đang đăng lên...
                </>
              ) : (
                <><Upload size={18} /> Đăng lên</>
              )}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
