import { describe, it, expect } from 'vitest'
import { parseGenerationCsv, parseConsumptionCsv, GenerationEntrySchema } from './energy'

describe('energy validation', () => {
  it('rejects exported > generated and future dates', () => {
    expect(GenerationEntrySchema.safeParse({ recordDate: '2026-01-01', generationKwh: 5, exportedKwh: 6 }).success).toBe(false)
    expect(GenerationEntrySchema.safeParse({ recordDate: '2999-01-01', generationKwh: 5 }).success).toBe(false)
  })

  it('parses a valid generation CSV and reports bad rows with line numbers', () => {
    const ok = parseGenerationCsv('date,generation_kwh,exported_kwh\n2026-01-01,12.5,3\n2026-01-02,10,1')
    expect(ok.errors).toEqual([])
    expect(ok.rows).toHaveLength(2)
    const bad = parseGenerationCsv('date,generation_kwh\n2026-01-01,abc')
    expect(bad.rows).toHaveLength(0)
    expect(bad.errors[0].line).toBe(2)
  })

  it('rejects unknown columns and handles quoted fields / BOM', () => {
    expect(parseConsumptionCsv('date,foo\n2026-01-01,1').errors[0].message).toMatch(/Unknown column/)
    const r = parseConsumptionCsv('﻿date,consumption_kwh,bill_amount\n"2026-01-01","320","2,450"')
    expect(r.errors[0]?.message).toBeDefined() // "2,450" is not a number
  })
})
