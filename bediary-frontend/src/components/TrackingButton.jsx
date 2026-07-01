import { useState } from 'react'

const ACTIVITIES = [
  { type: 'SLEEP',  emoji: '😴', label: 'Ngủ',     desc: 'Ghi giấc ngủ',  bg: '#F0EBFF', color: '#7C3AED', border: '#DDD0FF' },
  { type: 'FEED',   emoji: '🍼', label: 'Bú / Ăn', desc: 'Ghi bữa ăn',   bg: 'var(--c-primary-light)', color: 'var(--c-primary)', border: '#FFD6E4' },
  { type: 'DIAPER', emoji: '👶', label: 'Thay tã',  desc: 'Ghi thay tã',  bg: 'var(--c-warning-bg)', color: 'var(--c-warning)', border: '#FFD9A0' },
]

export default function TrackingButton({ onLog }) {
  const [tapping, setTapping] = useState(null)
  const [done, setDone] = useState(null)

  const handleTap = async (activity) => {
    if (tapping) return
    setTapping(activity.type)
    const payload = {
      activityType: activity.type,
      startTime: new Date().toISOString(),
      metadata: activity.type === 'FEED' ? { unit: 'ml', value: 0 }
              : activity.type === 'DIAPER' ? { diaper_type: 'WET' } : {},
    }
    try {
      await onLog(payload)
      setDone(activity.type)
      setTimeout(() => setDone(null), 1500)
    } finally {
      setTimeout(() => setTapping(null), 800)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
      {ACTIVITIES.map((a) => {
        const isLoading = tapping === a.type
        const isDone = done === a.type

        return (
          <button
            key={a.type}
            id={`track-${a.type.toLowerCase()}`}
            onClick={() => handleTap(a)}
            disabled={!!tapping}
            style={{
              background: a.bg,
              border: `1.5px solid ${a.border}`,
              borderRadius: 20,
              padding: '18px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              cursor: tapping ? 'not-allowed' : 'pointer',
              opacity: tapping && !isLoading ? 0.6 : 1,
              transition: 'all 0.2s ease',
              boxShadow: isLoading ? `0 4px 16px ${a.border}` : 'none',
              transform: isLoading ? 'scale(0.96)' : 'scale(1)',
            }}
          >
            {isLoading ? (
              <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 24, height: 24, border: `3px solid ${a.border}`, borderTopColor: a.color, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : isDone ? (
              <div style={{ fontSize: 28 }}>✅</div>
            ) : (
              <div style={{ fontSize: 32 }}>{a.emoji}</div>
            )}
            <p style={{ fontSize: 13, fontWeight: 700, color: a.color, margin: 0 }}>{a.label}</p>
            <p style={{ fontSize: 11, color: a.color, opacity: 0.7, margin: 0 }}>{a.desc}</p>
          </button>
        )
      })}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
