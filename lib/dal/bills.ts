import 'server-only'

import { createSupabaseServerClient } from '@/lib/db/client'
import { requireUser } from './users'
import type { Database, Json } from '@/lib/types/supabase'
import type { BillCheck, BillFields } from '@/lib/billing/reconcile'

type BillRow = Database['public']['Tables']['electricity_bills']['Row']

export type BillRecord = BillFields & {
  id: string
  tariffCategory: string
  source: 'manual' | 'upload'
  checks: BillCheck[]
  createdAt: string
}

const n = (v: number | null) => (v == null ? null : Number(v))

function mapBill(b: BillRow): BillRecord {
  return {
    id: b.id,
    billingPeriodStart: b.billing_period_start,
    billingPeriodEnd: b.billing_period_end,
    importKwh: n(b.import_kwh),
    exportKwh: n(b.export_kwh),
    bankedOpeningKwh: n(b.banked_opening_kwh),
    bankedClosingKwh: n(b.banked_closing_kwh),
    billedUnits: n(b.billed_units),
    energyCharge: n(b.energy_charge),
    fixedCharge: n(b.fixed_charge),
    electricityDuty: n(b.electricity_duty),
    fuelSurcharge: n(b.fuel_surcharge),
    otherCharges: n(b.other_charges),
    totalAmount: Number(b.total_bill),
    tariffCategory: b.tariff_category,
    source: b.source,
    checks: (b.checks as unknown as BillCheck[]) ?? [],
    createdAt: b.created_at,
  }
}

/** Bills newest first. */
export async function listBills(userId?: string, limit = 36): Promise<BillRecord[]> {
  const supabase = await createSupabaseServerClient()
  const uid = userId ?? (await requireUser()).id
  const { data, error } = await supabase
    .from('electricity_bills')
    .select('*')
    .eq('user_id', uid)
    .order('billing_period_end', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Failed to load bills: ${error.message}`)
  return (data ?? []).map(mapBill)
}

/** Bill that ended most recently before `beforeDate` (for credit continuity). */
export async function getPreviousBill(beforeDate: string): Promise<BillRecord | null> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('electricity_bills')
    .select('*')
    .eq('user_id', user.id)
    .lt('billing_period_end', beforeDate)
    .order('billing_period_end', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? mapBill(data) : null
}

/** Import/export from the user's devices or logs between two dates (inclusive start, exclusive end). */
export async function getMeterTotals(start: string, end: string, userId?: string) {
  const supabase = await createSupabaseServerClient()
  const uid = userId ?? (await requireUser()).id
  const { data, error } = await supabase
    .from('solar_generation_history')
    .select('record_date, exported_kwh, grid_import_kwh')
    .eq('user_id', uid)
    .gte('record_date', start)
    .lt('record_date', end)
  if (error) throw new Error(`Failed to load readings: ${error.message}`)
  const rows = data ?? []
  return {
    importKwh: rows.reduce((a, r) => a + Number(r.grid_import_kwh), 0),
    exportKwh: rows.reduce((a, r) => a + Number(r.exported_kwh), 0),
    daysCovered: rows.length,
  }
}

/**
 * Saves (or replaces, by period end) a reviewed bill with its check results, and mirrors the month into
 * consumption_history so sizing, tariff and forecasts use the same numbers.
 */
export async function saveBill(fields: BillFields & { tariffCategory: string | null; source: 'manual' | 'upload' }, checks: BillCheck[]): Promise<BillRecord> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()
  const units = fields.importKwh ?? fields.billedUnits ?? 0
  const { data, error } = await supabase
    .from('electricity_bills')
    .upsert(
      {
        user_id: user.id,
        billing_period_start: fields.billingPeriodStart,
        billing_period_end: fields.billingPeriodEnd,
        units_consumed: units,
        import_kwh: fields.importKwh,
        export_kwh: fields.exportKwh,
        banked_opening_kwh: fields.bankedOpeningKwh,
        banked_closing_kwh: fields.bankedClosingKwh,
        billed_units: fields.billedUnits,
        energy_charge: fields.energyCharge ?? 0,
        fixed_charge: fields.fixedCharge ?? 0,
        electricity_duty: fields.electricityDuty,
        fuel_surcharge: fields.fuelSurcharge,
        other_charges: fields.otherCharges,
        taxes: fields.electricityDuty ?? 0,
        total_bill: fields.totalAmount,
        tariff_category: fields.tariffCategory || 'LT-I Domestic',
        tariff_rate: units > 0 ? Math.round((fields.totalAmount / units) * 100) / 100 : 0,
        source: fields.source,
        checks: checks as unknown as Json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,billing_period_end' }
    )
    .select('*')
    .single()
  if (error || !data) throw new Error(`Failed to save bill: ${error?.message}`)

  // The bill month is the month in which the consumption period mostly falls.
  const mid = new Date((Date.parse(fields.billingPeriodStart) + Date.parse(fields.billingPeriodEnd)) / 2)
  const month = mid.toISOString().slice(0, 7)
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  await supabase.from('consumption_history').upsert(
    {
      user_id: user.id,
      record_date: `${month}-01`,
      month: MONTHS[mid.getUTCMonth()],
      year: mid.getUTCFullYear(),
      consumption_kwh: units,
      bill_amount: fields.totalAmount,
      units_imported: fields.importKwh,
      units_exported: fields.exportKwh ?? 0,
      tariff_rate: units > 0 ? Math.round((fields.totalAmount / units) * 100) / 100 : null,
      source: 'bill_import',
    },
    { onConflict: 'user_id,month,year' }
  )
  return mapBill(data)
}

export async function deleteBill(id: string): Promise<void> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('electricity_bills').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(`Failed to delete bill: ${error.message}`)
}
