import { z } from 'zod'

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((d) => !Number.isNaN(Date.parse(d)), 'Invalid date')
  .refine((d) => Date.parse(d) <= Date.now() + 24 * 3600 * 1000, 'Date cannot be in the future')

const nonNeg = (max: number) => z.coerce.number().min(0).max(max)

export const GenerationEntrySchema = z
  .object({
    recordDate: isoDate,
    generationKwh: nonNeg(5000),
    exportedKwh: nonNeg(5000).default(0),
    gridImportKwh: nonNeg(5000).default(0),
    peakGenerationKw: nonNeg(1000).nullable().optional(),
  })
  .refine((v) => v.exportedKwh <= v.generationKwh, {
    message: 'Exported energy cannot exceed generation',
    path: ['exportedKwh'],
  })

export type GenerationEntry = z.infer<typeof GenerationEntrySchema>

export const ConsumptionEntrySchema = z.object({
  /** First day of the billing month, YYYY-MM-DD */
  recordDate: isoDate,
  consumptionKwh: nonNeg(100000),
  billAmount: nonNeg(10000000),
  peakDemandKw: nonNeg(1000).nullable().optional(),
  unitsExported: nonNeg(100000).nullable().optional(),
  tariffRate: z.coerce.number().min(0).max(50).nullable().optional(),
})

export type ConsumptionEntry = z.infer<typeof ConsumptionEntrySchema>

export const MAX_CSV_ROWS = 1000

export type CsvParseResult<T> = {
  rows: T[]
  errors: { line: number; message: string }[]
}

/** Minimal RFC-4180-ish CSV parser (quotes, commas). Header row required. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') inQuotes = false
      else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((f) => f.trim() !== '')) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some((f) => f.trim() !== '')) rows.push(row)
  return rows
}

const GENERATION_COLUMNS: Record<string, keyof GenerationEntry> = {
  date: 'recordDate',
  generation_kwh: 'generationKwh',
  exported_kwh: 'exportedKwh',
  grid_import_kwh: 'gridImportKwh',
  peak_kw: 'peakGenerationKw',
}

const CONSUMPTION_COLUMNS: Record<string, keyof ConsumptionEntry> = {
  date: 'recordDate',
  consumption_kwh: 'consumptionKwh',
  bill_amount: 'billAmount',
  peak_demand_kw: 'peakDemandKw',
  units_exported: 'unitsExported',
  tariff_rate: 'tariffRate',
}

function parseTable<T>(
  text: string,
  columns: Record<string, string>,
  schema: z.ZodType<T>
): CsvParseResult<T> {
  const table = parseCsv(text)
  if (table.length < 2) return { rows: [], errors: [{ line: 1, message: 'File has no data rows' }] }
  if (table.length - 1 > MAX_CSV_ROWS) {
    return { rows: [], errors: [{ line: 1, message: `Maximum ${MAX_CSV_ROWS} rows per import` }] }
  }
  const header = table[0].map((h) => h.trim().toLowerCase())
  const unknown = header.filter((h) => !(h in columns))
  if (unknown.length) {
    return {
      rows: [],
      errors: [{ line: 1, message: `Unknown column(s): ${unknown.join(', ')}. Expected: ${Object.keys(columns).join(', ')}` }],
    }
  }
  const rows: T[] = []
  const errors: { line: number; message: string }[] = []
  table.slice(1).forEach((cells, idx) => {
    const raw: Record<string, unknown> = {}
    header.forEach((h, i) => {
      const v = cells[i]?.trim()
      if (v !== undefined && v !== '') raw[columns[h]] = v
    })
    const parsed = schema.safeParse(raw)
    if (parsed.success) rows.push(parsed.data)
    else errors.push({ line: idx + 2, message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') })
  })
  return { rows, errors }
}

export const parseGenerationCsv = (text: string) => parseTable(text, GENERATION_COLUMNS, GenerationEntrySchema)
export const parseConsumptionCsv = (text: string) => parseTable(text, CONSUMPTION_COLUMNS, ConsumptionEntrySchema)
