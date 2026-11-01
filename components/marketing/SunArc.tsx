/**
 * Hero illustration: the sun travelling across the sky while the day's output curve draws beneath it.
 * The curve is an idealised clear-sky shape (labelled as such), not user data. Pure SVG + CSS.
 */
export default function SunArc() {
  const W = 520
  const H = 300
  const base = 250
  const arc = `M40,${base} Q${W / 2},-40 ${W - 40},${base}`
  const curve = Array.from({ length: 61 }, (_, i) => {
    const t = i / 60
    const x = 40 + t * (W - 80)
    const y = base - Math.pow(Math.max(0, Math.sin(Math.PI * t)), 1.4) * 170
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <figure className="relative rounded-lg border bg-card p-5">
      <div className="mb-3 flex items-center justify-between text-[12px]">
        <span className="font-medium">A clear day on a 3 kW roof</span>
        <span className="eyebrow">Illustration</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Sun path and the generation curve it produces">
        <defs>
          <path id="sun-path" d={arc} />
        </defs>
        {[90, 150, 210].map((y) => (
          <line key={y} x1={40} x2={W - 40} y1={y} y2={y} stroke="var(--border)" strokeDasharray="2 4" />
        ))}
        <path d={arc} fill="none" stroke="var(--border)" strokeWidth={1.25} strokeDasharray="3 5" />
        <path d={`${curve} L${W - 40},${base} L40,${base} Z`} fill="var(--primary)" opacity={0.1} className="hero-fill" />
        <path d={curve} fill="none" stroke="var(--primary)" strokeWidth={2.25} pathLength={1} className="hero-curve" />
        <line x1={40} x2={W - 40} y1={base} y2={base} stroke="var(--foreground)" strokeOpacity={0.25} />
        <g className="hero-sun">
          <circle r={14} fill="var(--warning)" opacity={0.18} />
          <circle r={7} fill="var(--warning)" />
        </g>
        {['6am', '9am', '12pm', '3pm', '6pm'].map((l, i) => (
          <text key={l} x={40 + (i * (W - 80)) / 4} y={base + 22} fontSize={11} textAnchor="middle" fill="var(--muted-foreground)" fontFamily="var(--font-plex-mono)">
            {l}
          </text>
        ))}
      </svg>
      <div className="mt-2 grid grid-cols-3 gap-px overflow-hidden rounded-md border bg-border text-[12px]">
        {[
          ['Peak', '2.4 kW'],
          ['Day total', '14.6 kWh'],
          ['Saves at ₹9.50', '₹139'],
        ].map(([k, v]) => (
          <div key={k} className="bg-card px-3 py-2">
            <p className="text-muted-foreground">{k}</p>
            <p className="num text-[15px]">{v}</p>
          </div>
        ))}
      </div>
    </figure>
  )
}
