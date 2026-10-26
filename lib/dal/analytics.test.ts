import { describe, it, expect } from 'vitest'
import { computeEnergyStatistics, type ConsumptionRecord } from '@/lib/types/analytics'

const rec = (month: string, year: number, kwh: number, bill: number, peak: number | null = null): ConsumptionRecord => ({
  id: `${month}${year}`,
  userId: 'u',
  recordDate: `${year}-01-01`,
  month,
  year,
  consumptionKwh: kwh,
  billAmount: bill,
  peakDemandKw: peak,
  unitsImported: kwh,
  unitsExported: 0,
  tariffRate: null,
  source: 'user_entered',
  createdAt: '2026-01-01',
})

describe('computeEnergyStatistics', () => {
  it('returns nulls, not invented numbers, when there is no data', () => {
    const s = computeEnergyStatistics([])
    expect(s.totalRecords).toBe(0)
    expect(s.averageMonthlyConsumption).toBeNull()
    expect(s.yoyConsumptionChangePercent).toBeNull()
  })

  it('aggregates real records', () => {
    const s = computeEnergyStatistics([rec('Jan', 2025, 300, 2000, 3), rec('Feb', 2025, 500, 4000), rec('Mar', 2025, 100, 800, 1)])
    expect(s.averageMonthlyConsumption).toBe(300)
    expect(s.highestConsumption).toBe(500)
    expect(s.highestMonth).toBe('Feb 2025')
    expect(s.lowestMonth).toBe('Mar 2025')
    expect(s.peakDemandAverageKw).toBe(2)
    expect(s.yoyConsumptionChangePercent).toBeNull()
  })
})
