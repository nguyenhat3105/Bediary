import { useNavigate } from 'react-router-dom'
import { Sparkles, Check, Brain, Zap, Shield } from 'lucide-react'
import Navbar from '../components/Navbar'

const FEATURES = [
  {
    icon: <Brain size={22} color="#ec4899" />,
    emoji: '🤖',
    title: 'AI Caption thong minh',
    desc: 'Tu dong tao chu thich cho anh be bang tri tue nhan tao, tinh te va cam xuc.',
  },
  {
    icon: <Sparkles size={22} color="#f59e0b" />,
    emoji: '✨',
    title: 'Meo cham soc khong gioi han',
    desc: 'Truy cap toan bo thu vien meo nuoi day con khoa hoc, cap nhat lien tuc.',
  },
  {
    icon: <Zap size={22} color="#8b5cf6" />,
    emoji: '⚡',
    title: 'Phan tich suc khoe nhanh hon',
    desc: 'Bieu do tang truong, bao cao dinh duong va canh bao thong minh theo thoi gian thuc.',
  },
  {
    icon: <Shield size={22} color="#10b981" />,
    emoji: '🛡️',
    title: 'Ho tro uu tien',
    desc: 'Doi ngu chuyen gia san sang tra loi moi thac mac cua ban 24/7.',
  },
]

export default function PremiumPage() {
  const navigate = useNavigate()

  const handleUpgrade = () => {
    alert('Tinh nang nang cap dang duoc phat trien. Vui long thu lai sau!')
  }

  return (
    <div className="page-container">
      <Navbar />

      <div className="content-area" style={{ paddingBottom: '40px' }}>
        {/* Hero Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ec4899 0%, #f97316 50%, #f59e0b 100%)',
            borderRadius: '20px',
            padding: '32px 24px',
            marginBottom: '28px',
            textAlign: 'center',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative circles */}
          <div
            style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-30px',
              left: '-30px',
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>👑</div>
            <span
              className="badge-pink"
              style={{
                display: 'inline-block',
                marginBottom: '12px',
                background: 'rgba(255,255,255,0.25)',
                color: '#fff',
                fontWeight: 700,
                padding: '4px 14px',
                borderRadius: '999px',
                fontSize: '12px',
                letterSpacing: '0.08em',
              }}
            >
              BEDIARY PREMIUM
            </span>
            <h1
              style={{
                margin: '0 0 10px',
                fontSize: '26px',
                fontWeight: 800,
                color: '#fff',
                lineHeight: 1.2,
              }}
            >
              Nang tam cham soc be
              <br />
              cung AI tien tien ✨
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.6,
              }}
            >
              Trai nghiem day du tinh nang Premium de theo doi va nuoi duong be
              <br />
              mot cach khoa hoc va yeu thuong nhat.
            </p>
          </div>
        </div>

        {/* Features List */}
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '16px',
          }}
        >
          Nhung gi ban nhan duoc 🎁
        </h2>

        <div className="card-list" style={{ marginBottom: '28px' }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="card card-pink"
              style={{
                borderLeft: '4px solid #ec4899',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '16px',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(249,115,22,0.1))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '22px',
                }}
              >
                {f.emoji}
              </div>
              <div>
                <p
                  style={{
                    margin: '0 0 4px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                >
                  {f.title}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Card */}
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '2px solid #ec4899',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '20px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              margin: '0 0 6px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.6)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 600,
            }}
          >
            Chi phi
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: '6px',
            }}
          >
            <span style={{ fontSize: '42px', fontWeight: 800, color: '#fff' }}>99K</span>
            <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>/thang</span>
          </div>
          <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
            Huy bat cu luc nao, khong rang buoc
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              textAlign: 'left',
              marginBottom: '0',
            }}
          >
            {[
              'Tat ca tinh nang mien phi',
              'AI Caption khong gioi han',
              'Bieu do suc khoe nang cao',
              'Meo cham soc cao cap',
              'Ho tro uu tien 24/7',
            ].map((item, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ec4899, #f97316)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Check size={12} color="#fff" strokeWidth={3} />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <button
          className="btn-primary"
          onClick={handleUpgrade}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
            borderRadius: '14px',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(236,72,153,0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Sparkles size={20} />
          Nang cap ngay
        </button>

        <p
          style={{
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginTop: '12px',
          }}
        >
          🔒 Thanh toan an toan &bull; Huy bat cu luc nao
        </p>
      </div>
    </div>
  )
}
