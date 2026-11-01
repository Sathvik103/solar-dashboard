import { z } from 'zod'

/**
 * Wire format for POST /api/v1/telemetry.
 *
 * Devices send interval samples. `power_w` is instantaneous AC output; the `*_wh_total` fields are
 * monotonically increasing lifetime counters as reported by the inverter or meter. Counters make
 * daily energy exact even when samples are missed; power alone is integrated as a fallback.
 */
export const MAX_SAMPLES_PER_BATCH = 1000

const finite = (min: number, max: number) => z.number().finite().min(min).max(max)

export const TelemetrySampleSchema = z.object({
  ts: z
    .string()
    .datetime({ offset: true, message: 'ts must be ISO-8601 with a timezone, e.g. 2026-11-01T12:00:00+05:30' }),
  power_w: finite(-1_000_000, 1_000_000).optional(),
  energy_wh_total: finite(0, 1e12).optional(),
  import_wh_total: finite(0, 1e12).optional(),
  export_wh_total: finite(0, 1e12).optional(),
  voltage_v: finite(0, 1000).optional(),
  frequency_hz: finite(0, 100).optional(),
  temperature_c: finite(-50, 150).optional(),
  status: z.string().max(40).optional(),
})

export const TelemetryBatchSchema = z.object({
  samples: z.array(TelemetrySampleSchema).min(1).max(MAX_SAMPLES_PER_BATCH),
})

export type IngestResult = {
  received: number
  accepted: number
  duplicates: number
  rejected: number
  days_updated: number
}

// --- Device status ----------------------------------------------------------------------------------

export type DeviceStatus = 'online' | 'delayed' | 'offline' | 'never'

/** Online within 2 reporting intervals, delayed within 6, otherwise offline. */
export function deviceStatus(lastSeenAt: string | null, intervalS: number, now = Date.now()): DeviceStatus {
  if (!lastSeenAt) return 'never'
  const age = (now - Date.parse(lastSeenAt)) / 1000
  if (age <= Math.max(120, intervalS * 2)) return 'online'
  if (age <= Math.max(900, intervalS * 6)) return 'delayed'
  return 'offline'
}

// --- Energy from samples (mirrors public.compute_device_day) -------------------------------------------

export type SamplePoint = { ts: string; power_w: number | null; energy_wh_total: number | null }

const MAX_GAP_S = 1800

/** Energy in Wh over the samples: counter delta when available, else trapezoidal power integral. */
export function energyFromSamples(samples: SamplePoint[], baselineWh?: number | null): number {
  const sorted = [...samples].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))
  const counters = sorted.map((s) => s.energy_wh_total).filter((v): v is number => v != null)
  if (counters.length > 0) {
    const start = baselineWh ?? Math.min(...counters)
    return Math.max(0, Math.max(...counters) - start)
  }
  let wh = 0
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1]
    const b = sorted[i]
    if (a.power_w == null || b.power_w == null) continue
    const dt = (Date.parse(b.ts) - Date.parse(a.ts)) / 1000
    if (dt <= 0 || dt > MAX_GAP_S) continue
    wh += Math.max(0, (a.power_w + b.power_w) / 2) * (dt / 3600)
  }
  return wh
}

/** Data completeness for a window: received samples / expected samples (capped at 1). */
export function completeness(sampleCount: number, windowS: number, intervalS: number): number {
  const expected = Math.max(1, Math.floor(windowS / intervalS))
  return Math.min(1, sampleCount / expected)
}
