import { describe, it, expect } from 'vitest'
import { runLedger, settlementYear } from './ledger'
import { overallStatus, reconcileBill, type BillFields } from './reconcile'
import { checkQuote } from './quote'

describe('settlementYear', () => {
  it('runs April to March in IST', () => {
    expect(settlementYear(new Date('2026-11-01T00:00:00Z')).months[0]).toBe('2026-04')
    expect(settlementYear(new Date('2027-02-10T00:00:00Z')).label).toBe('FY 2026-27')
    expect(settlementYear(new Date('2026-03-31T20:00:00Z')).months[0]).toBe('2026-04') // 1 April IST
  })
})

describe('runLedger', () => {
  const year = settlementYear(new Date('2026-06-01T00:00:00Z'))
  it('banks surplus, offsets later imports and values the year-end balance', () => {
    const inputs = year.months.map((month, i) => ({
      month,
      importKwh: i < 2 ? 200 : 300,
      exportKwh: i < 2 ? 350 : 250,
      source: (i < 6 ? 'bill' : 'forecast') as 'bill' | 'forecast',
    }))
    const l = runLedger(year, inputs, { appcInrPerKwh: 5.33, marginalTariffInrPerKwh: 7.7 })
    expect(l.rows[0]).toMatchObject({ bankedInKwh: 150, billedUnits: 0, closingBankKwh: 150 })
    expect(l.rows[2]).toMatchObject({ bankUsedKwh: 50, billedUnits: 0, closingBankKwh: 250 })
    expect(l.rows[7]).toMatchObject({ bankUsedKwh: 50, closingBankKwh: 0 })
    expect(l.rows[8]).toMatchObject({ bankUsedKwh: 0, billedUnits: 50 })
    expect(l.yearEndBankKwh).toBe(0)
    expect(l.coverage).toEqual({ actual: 6, forecast: 6, missing: 0 })
    expect(l.currentBankKwh).toBe(100)
  })

  it('trusts the closing balance printed on a bill', () => {
    const l = runLedger(year, [{ month: year.months[0], importKwh: 100, exportKwh: 200, source: 'bill', billClosingBankKwh: 80 }], { appcInrPerKwh: 5.33 })
    expect(l.rows[0].closingBankKwh).toBe(80)
    expect(l.yearEndBankKwh).toBeNull()
  })
})

const bill = (over: Partial<BillFields> = {}): BillFields => ({
  billingPeriodStart: '2026-09-01',
  billingPeriodEnd: '2026-10-01',
  importKwh: 420,
  exportKwh: 300,
  bankedOpeningKwh: 50,
  bankedClosingKwh: 0,
  billedUnits: 70,
  energyCharge: 70 * 1.95 > 0 ? 50 * 1.95 + 20 * 3.1 : 0,
  fixedCharge: 30,
  electricityDuty: null,
  fuelSurcharge: null,
  otherCharges: null,
  totalAmount: 50 * 1.95 + 20 * 3.1 + 30,
  ...over,
})

describe('reconcileBill', () => {
  it('passes a consistent bill', () => {
    const checks = reconcileBill(bill(), { previousClosingBankKwh: 50, sanctionedLoadKw: 3, meter: { importKwh: 418, exportKwh: 302, daysCovered: 30 } })
    expect(checks.filter((c) => c.status === 'fail')).toEqual([])
    expect(overallStatus(checks)).toBe('ok')
  })

  it('catches wrong carried-forward credit and under-credited export', () => {
    const checks = reconcileBill(bill({ bankedClosingKwh: 30 }), { previousClosingBankKwh: 90, meter: { importKwh: 420, exportKwh: 380, daysCovered: 29 } })
    const byId = Object.fromEntries(checks.map((c) => [c.id, c.status]))
    expect(byId['net-arithmetic']).toBe('fail')
    expect(byId['credit-continuity']).toBe('fail')
    expect(byId['export-vs-meter']).toBe('fail')
  })

  it('skips meter checks when coverage is low', () => {
    const checks = reconcileBill(bill(), { meter: { importKwh: 100, exportKwh: 100, daysCovered: 10 } })
    expect(checks.find((c) => c.id === 'export-vs-meter')?.status).toBe('skipped')
  })
})

describe('checkQuote', () => {
  it('flags wrong subsidy, capacity mismatch and non-DCR modules', () => {
    const r = checkQuote({
      capacityKw: 3,
      totalPriceInr: 210000,
      priceIsAfterSubsidy: false,
      subsidyStatedInr: 90000,
      moduleBrand: 'X',
      moduleWattage: 540,
      moduleCount: 5,
      dcrModules: false,
      inverterBrand: 'Y',
      inverterCapacityKw: 3,
      performanceWarrantyYears: 25,
      includesNetMeter: true,
    })
    const byId = Object.fromEntries(r.checks.map((c) => [c.id, c.status]))
    expect(byId.subsidy).toBe('fail')
    expect(byId.capacity).toBe('fail')
    expect(byId.dcr).toBe('fail')
    expect(r.subsidyInr).toBe(78000)
    expect(r.netPriceInr).toBe(132000)
  })

  it('reconstructs gross price from a post-subsidy quote', () => {
    const r = checkQuote({
      capacityKw: 2,
      totalPriceInr: 64000,
      priceIsAfterSubsidy: true,
      subsidyStatedInr: 60000,
      moduleBrand: null,
      moduleWattage: null,
      moduleCount: null,
      dcrModules: true,
      inverterBrand: null,
      inverterCapacityKw: null,
      performanceWarrantyYears: null,
      includesNetMeter: null,
    })
    expect(r.grossPriceInr).toBe(124000)
    expect(r.checks.find((c) => c.id === 'price')?.status).toBe('ok')
  })
})
