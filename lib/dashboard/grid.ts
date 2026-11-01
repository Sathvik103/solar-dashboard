import { NET_METERING_SETTLEMENT_INR_PER_KWH } from '@/lib/calculations/tariffs'

export type GridSummary = {
  exportedKwh: number
  importedKwh: number
  selfConsumedKwh: number
  /** Exported minus imported over the window; positive means surplus. */
  netExportKwh: number
  /** Value of the surplus at APPC, only realised if still unadjusted at the 31 March settlement. */
  surplusValueAtAppcInr: number | null
  days: number
  lastReadingDate: string
  lastReadingSource: 'inverter_telemetry' | 'manual_log' | 'estimated'
}

const round = (n: number) => Math.round(n * 100) / 100

export function summariseGrid(
  generation: {
    recordDate: string
    exportedKwh: number
    gridImportKwh: number
    selfConsumedKwh: number
    source: 'inverter_telemetry' | 'manual_log' | 'estimated'
  }[]
): GridSummary | null {
  if (generation.length === 0) return null
  const exported = generation.reduce((a, g) => a + g.exportedKwh, 0)
  const imported = generation.reduce((a, g) => a + g.gridImportKwh, 0)
  const last = [...generation].sort((a, b) => a.recordDate.localeCompare(b.recordDate)).at(-1)!
  const net = exported - imported
  return {
    exportedKwh: round(exported),
    importedKwh: round(imported),
    selfConsumedKwh: round(generation.reduce((a, g) => a + g.selfConsumedKwh, 0)),
    netExportKwh: round(net),
    surplusValueAtAppcInr: net > 0 ? round(net * NET_METERING_SETTLEMENT_INR_PER_KWH) : null,
    days: generation.length,
    lastReadingDate: last.recordDate,
    lastReadingSource: last.source,
  }
}
