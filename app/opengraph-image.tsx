import { ImageResponse } from 'next/og'
import { SITE } from '@/lib/site'

export const alt = `${SITE.name}: ${SITE.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** Social preview: brand, tagline and an idealised clear-sky generation curve. */
export default function OpenGraphImage() {
  // Clear-sky shape for illustration only (sine of solar elevation); not user data.
  const points = Array.from({ length: 49 }, (_, i) => {
    const x = 80 + i * 21
    const t = i / 48
    const y = 560 - Math.max(0, Math.sin(Math.PI * t)) ** 1.3 * 230
    return `${x},${y.toFixed(1)}`
  }).join(' ')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#f5f2ec',
          padding: '72px 80px',
          fontFamily: 'sans-serif',
          color: '#1d1b18',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 52, height: 52, borderRadius: 10, background: '#b4532a' }} />
          <div style={{ fontSize: 36, fontWeight: 600 }}>{SITE.name}</div>
        </div>
        <div style={{ marginTop: 56, fontSize: 64, fontWeight: 600, lineHeight: 1.08, maxWidth: 900 }}>
          Know what your roof will earn before you install.
        </div>
        <div style={{ marginTop: 22, fontSize: 28, color: '#6b655c' }}>{SITE.tagline}</div>
        <svg width="1200" height="630" style={{ position: 'absolute', left: 0, top: 0 }}>
          <polyline points={points} fill="none" stroke="#b4532a" strokeWidth="5" />
          <line x1="80" y1="561" x2="1088" y2="561" stroke="#ddd6c9" strokeWidth="2" />
        </svg>
      </div>
    ),
    size
  )
}
