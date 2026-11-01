import { describe, it, expect } from 'vitest'
import { summariseGrid } from './grid'

const day = (recordDate: string, exportedKwh: number, gridImportKwh: number, source: 'manual_log' | 'inverter_telemetry' = 'manual_log') => ({
  recordDate,
  exportedKwh,
  gridImportKwh,
  selfConsumedKwh: 5,
  source,
})

describe('summariseGrid', () => {
  it('returns null without readings', () => {
    expect(summariseGrid([])).toBeNull()
  })

  it('values only a net surplus, at APPC', () => {
    const g = summariseGrid([day('2026-10-02', 6, 1, 'inverter_telemetry'), day('2026-10-01', 4, 2)])!
    expect(g.netExportKwh).toBe(7)
    expect(g.surplusValueAtAppcInr).toBeCloseTo(7 * 5.33, 2)
    expect(g.lastReadingDate).toBe('2026-10-02')
    expect(g.lastReadingSource).toBe('inverter_telemetry')
  })

  it('reports a net draw without a credit value', () => {
    const g = summariseGrid([day('2026-10-01', 1, 5)])!
    expect(g.netExportKwh).toBe(-4)
    expect(g.surplusValueAtAppcInr).toBeNull()
  })
})
