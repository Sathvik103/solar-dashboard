/** Matches POST /api/v1/telemetry. Counters are lifetime totals in Wh. */
export type Sample = {
  ts: string
  power_w?: number
  energy_wh_total?: number
  import_wh_total?: number
  export_wh_total?: number
  voltage_v?: number
  frequency_hz?: number
  temperature_c?: number
  status?: string
}

/** A source produces one sample per call (poll-based) or pushes samples via `onSample` (event-based). */
export interface Source {
  name: string
  start?(onSample: (s: Sample) => void): Promise<void>
  read?(): Promise<Sample | null>
  stop(): Promise<void>
}

export type Config = {
  url: string
  token: string
  source: 'modbus' | 'mqtt' | 'simulator'
  intervalS: number
  batchSize: number
  bufferFile: string
  bufferMax: number
}

export function env(name: string, fallback?: string): string {
  const v = process.env[name]
  if (v != null && v !== '') return v
  if (fallback != null) return fallback
  throw new Error(`Missing required setting ${name} (see agent.env.example)`)
}

export const num = (name: string, fallback: number) => {
  const n = Number(process.env[name] ?? fallback)
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number`)
  return n
}
