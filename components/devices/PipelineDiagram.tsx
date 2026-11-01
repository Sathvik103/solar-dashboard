/**
 * How readings travel from a roof to the dashboard. Pure SVG; the dashed connectors animate with CSS
 * (disabled under prefers-reduced-motion).
 */
const NODES = [
  { x: 10, title: 'Inverter or meter', sub: 'Modbus TCP, RS-485, cloud' },
  { x: 205, title: 'Edge agent', sub: 'Buffers offline, batches' },
  { x: 400, title: 'Ingest API', sub: 'POST /api/v1/telemetry' },
  { x: 595, title: 'Rollups', sub: 'Samples to daily energy' },
]

export default function PipelineDiagram() {
  return (
    <figure className="overflow-x-auto rounded-lg border bg-card p-5">
      <svg viewBox="0 0 780 96" className="min-w-[640px]" role="img" aria-labelledby="pipeline-title">
        <title id="pipeline-title">Device data pipeline</title>
        {NODES.slice(0, -1).map((n, i) => (
          <line
            key={i}
            x1={n.x + 175}
            y1={42}
            x2={NODES[i + 1].x}
            y2={42}
            stroke="var(--primary)"
            strokeWidth={1.5}
            strokeDasharray="4 5"
            className="flow-dash"
          />
        ))}
        {NODES.map((n, i) => (
          <g key={n.title}>
            <rect x={n.x} y={14} width={175} height={56} rx={6} fill="var(--background)" stroke="var(--border)" />
            <text x={n.x + 14} y={36} fontSize={12.5} fontWeight={600} fill="var(--foreground)">
              {n.title}
            </text>
            <text x={n.x + 14} y={55} fontSize={10.5} fill="var(--muted-foreground)">
              {n.sub}
            </text>
            <circle cx={n.x + 160} cy={28} r={3} fill={i === 3 ? 'var(--positive)' : 'var(--primary)'} />
          </g>
        ))}
        <text x={10} y={90} fontSize={10.5} fill="var(--muted-foreground)" fontFamily="var(--font-plex-mono)">
          token-authenticated · idempotent on (device, timestamp) · 1,000 samples per batch · rate limited per device
        </text>
      </svg>
    </figure>
  )
}
