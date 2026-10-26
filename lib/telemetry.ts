import { createHash, randomBytes } from 'crypto'
import { z } from 'zod'

/** Device tokens look like `sdt_<43 base64url chars>` (256 bits of entropy). */
export const DEVICE_TOKEN_PREFIX = 'sdt_'

export function generateDeviceToken(): { token: string; hash: string; prefix: string } {
  const token = DEVICE_TOKEN_PREFIX + randomBytes(32).toString('base64url')
  return { token, hash: hashDeviceToken(token), prefix: token.slice(0, 10) }
}

export function hashDeviceToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function parseBearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(sdt_[A-Za-z0-9_-]{43})$/)
  return match ? match[1] : null
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((d) => !Number.isNaN(Date.parse(d)), 'Invalid date')

const kwh = z.number().finite().min(0).max(5000)

export const TelemetryReadingSchema = z
  .object({
    date: isoDate,
    generation_kwh: kwh,
    exported_kwh: kwh.optional(),
    grid_import_kwh: kwh.optional(),
    peak_kw: z.number().finite().min(0).max(1000).optional(),
  })
  .refine((r) => (r.exported_kwh ?? 0) <= r.generation_kwh, {
    message: 'exported_kwh cannot exceed generation_kwh',
    path: ['exported_kwh'],
  })

export const TelemetryPayloadSchema = z.object({
  readings: z.array(TelemetryReadingSchema).min(1).max(400),
})

export type TelemetryReading = z.infer<typeof TelemetryReadingSchema>

/** One row per day (the last reading for a date wins — devices send cumulative daily totals). */
export function toRpcReadings(readings: TelemetryReading[]) {
  const byDate = new Map<string, TelemetryReading>()
  for (const r of readings) byDate.set(r.date, r)
  return [...byDate.values()].map((r) => ({
    record_date: r.date,
    generation_kwh: r.generation_kwh,
    exported_kwh: r.exported_kwh ?? 0,
    grid_import_kwh: r.grid_import_kwh ?? 0,
    peak_kw: r.peak_kw ?? null,
  }))
}
