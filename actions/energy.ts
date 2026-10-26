'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/session'
import { upsertConsumptionRecords, upsertGenerationRecords } from '@/lib/dal/analytics'
import {
  ConsumptionEntrySchema,
  GenerationEntrySchema,
  parseConsumptionCsv,
  parseGenerationCsv,
} from '@/lib/validations/energy'

export type EnergyActionState = {
  success?: string
  error?: string
  rowErrors?: { line: number; message: string }[]
}

const MAX_FILE_BYTES = 512 * 1024

function refresh() {
  revalidatePath('/dashboard')
  revalidatePath('/history')
}

async function guard(): Promise<string | null> {
  try {
    await requireUser()
    return null
  } catch {
    return 'You must be signed in.'
  }
}

export async function logGenerationAction(
  _prev: EnergyActionState | undefined,
  formData: FormData
): Promise<EnergyActionState> {
  const unauth = await guard()
  if (unauth) return { error: unauth }

  const parsed = GenerationEntrySchema.safeParse({
    recordDate: formData.get('recordDate'),
    generationKwh: formData.get('generationKwh'),
    exportedKwh: formData.get('exportedKwh') || 0,
    gridImportKwh: formData.get('gridImportKwh') || 0,
    peakGenerationKw: formData.get('peakGenerationKw') || null,
  })
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join('; ') }

  try {
    await upsertGenerationRecords([parsed.data])
  } catch (err) {
    return { error: (err as Error).message }
  }
  refresh()
  return { success: `Saved generation for ${parsed.data.recordDate}.` }
}

export async function logConsumptionAction(
  _prev: EnergyActionState | undefined,
  formData: FormData
): Promise<EnergyActionState> {
  const unauth = await guard()
  if (unauth) return { error: unauth }

  const month = String(formData.get('month') ?? '')
  const parsed = ConsumptionEntrySchema.safeParse({
    recordDate: /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : month,
    consumptionKwh: formData.get('consumptionKwh'),
    billAmount: formData.get('billAmount'),
    peakDemandKw: formData.get('peakDemandKw') || null,
    unitsExported: formData.get('unitsExported') || null,
    tariffRate: formData.get('tariffRate') || null,
  })
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join('; ') }

  try {
    await upsertConsumptionRecords([parsed.data], 'user_entered')
  } catch (err) {
    return { error: (err as Error).message }
  }
  refresh()
  return { success: `Saved bill for ${month}.` }
}

export async function importCsvAction(
  _prev: EnergyActionState | undefined,
  formData: FormData
): Promise<EnergyActionState> {
  const unauth = await guard()
  if (unauth) return { error: unauth }

  const kind = formData.get('kind')
  const file = formData.get('file')
  if (kind !== 'generation' && kind !== 'consumption') return { error: 'Choose a data type.' }
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a CSV file.' }
  if (file.size > MAX_FILE_BYTES) return { error: 'File is larger than 512 KB.' }

  const text = await file.text()
  try {
    if (kind === 'generation') {
      const { rows, errors } = parseGenerationCsv(text)
      if (errors.length) return { error: 'Nothing imported — fix these rows and retry.', rowErrors: errors.slice(0, 20) }
      const n = await upsertGenerationRecords(rows, 'manual_log')
      refresh()
      return { success: `Imported ${n} generation day(s).` }
    }
    const { rows, errors } = parseConsumptionCsv(text)
    if (errors.length) return { error: 'Nothing imported — fix these rows and retry.', rowErrors: errors.slice(0, 20) }
    const n = await upsertConsumptionRecords(rows, 'bill_import')
    refresh()
    return { success: `Imported ${n} month(s) of consumption.` }
  } catch (err) {
    return { error: (err as Error).message }
  }
}
