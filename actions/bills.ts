'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth/session'
import { deleteBill, getMeterTotals, getPreviousBill, saveBill } from '@/lib/dal/bills'
import { getSolarProfile } from '@/lib/dal/solar-profiles'
import { reconcileBill, type BillCheck } from '@/lib/billing/reconcile'
import { errorMessage } from '@/lib/utils'

const num = (max: number) => z.coerce.number().min(0).max(max).nullable()
const opt = (max: number) =>
  z.preprocess((v) => (v === '' || v == null ? null : v), num(max))
const signed = z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().min(-1_000_000).max(1_000_000).nullable())

const BillFormSchema = z
  .object({
    billingPeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date is required'),
    billingPeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date is required'),
    tariffCategory: z.string().max(40).nullable(),
    importKwh: opt(100_000),
    exportKwh: opt(100_000),
    bankedOpeningKwh: opt(100_000),
    bankedClosingKwh: opt(100_000),
    billedUnits: opt(100_000),
    energyCharge: opt(10_000_000),
    fixedCharge: opt(10_000_000),
    electricityDuty: opt(10_000_000),
    fuelSurcharge: signed,
    otherCharges: signed,
    totalAmount: z.coerce.number().min(0, 'Total is required').max(10_000_000),
    source: z.enum(['manual', 'upload']),
  })
  .refine((b) => b.billingPeriodEnd > b.billingPeriodStart, { message: 'End date must be after start date' })
  .refine((b) => (Date.parse(b.billingPeriodEnd) - Date.parse(b.billingPeriodStart)) / 86_400_000 <= 62, {
    message: 'Billing period cannot exceed two months',
  })
  .refine((b) => Date.parse(b.billingPeriodEnd) <= Date.now() + 86_400_000, { message: 'Billing period is in the future' })

export type BillActionState = { error?: string; checks?: BillCheck[]; savedId?: string }

export async function saveBillAction(_prev: BillActionState | undefined, formData: FormData): Promise<BillActionState> {
  try {
    await requireUser()
  } catch {
    return { error: 'You must be signed in.' }
  }
  const raw = Object.fromEntries(formData.entries())
  const parsed = BillFormSchema.safeParse({ ...raw, tariffCategory: raw.tariffCategory || null })
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join('; ') }
  const f = parsed.data

  try {
    const user = await requireUser()
    const [previous, meter, profile] = await Promise.all([
      getPreviousBill(f.billingPeriodEnd),
      getMeterTotals(f.billingPeriodStart, f.billingPeriodEnd),
      getSolarProfile(user.id),
    ])
    const checks = reconcileBill(f, {
      previousClosingBankKwh: previous?.bankedClosingKwh ?? null,
      sanctionedLoadKw: profile?.sanctionedLoadKw ?? null,
      meter: meter.daysCovered ? meter : null,
    })
    const saved = await saveBill(f, checks)
    revalidatePath('/billing')
    revalidatePath('/dashboard')
    return { checks, savedId: saved.id }
  } catch (err) {
    return { error: errorMessage(err) }
  }
}

export async function deleteBillAction(formData: FormData): Promise<void> {
  const id = z.string().uuid().safeParse(formData.get('id'))
  if (!id.success) return
  await deleteBill(id.data)
  revalidatePath('/billing')
}
