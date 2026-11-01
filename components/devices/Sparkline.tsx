/** Dependency-free SVG sparkline for small inline trends. */
export default function Sparkline({
  values,
  width = 120,
  height = 32,
  className,
}: {
  values: number[]
  width?: number
  height?: number
  className?: string
}) {
  if (values.length < 2) {
    return <svg width={width} height={height} className={className} aria-hidden />
  }
  const max = Math.max(...values, 1)
  const step = width / (values.length - 1)
  const pts = values.map((v, i) => [i * step, height - 2 - (v / max) * (height - 4)] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <path d={area} fill="var(--chart-1)" opacity={0.12} />
      <path d={line} fill="none" stroke="var(--chart-1)" strokeWidth={1.5} className="draw-path" pathLength={1} />
    </svg>
  )
}
