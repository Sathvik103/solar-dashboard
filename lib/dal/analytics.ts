import 'server-only'

import { createSupabaseServerClient } from '@/lib/db/client'
import { requireUser } from './users'
import type { Database } from '@/lib/types/supabase'
import type { ConsumptionEntry, GenerationEntry } from '@/lib/validations/energy'
import {
  type ConsumptionRecord,
  type GenerationRecord,
  type RegionalStatRecord,
  type SavedScenario,
  type RecommendationRecord,
  type SolarSystemRecord,
  computeEnergyStatistics,
} from '@/lib/types/analytics'

export { computeEnergyStatistics }
export type {
  ConsumptionRecord,
  GenerationRecord,
  RegionalStatRecord,
  SavedScenario,
  RecommendationRecord,
  SolarSystemRecord,
}

type Tables = Database['public']['Tables']

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthFields(isoDate: string) {
  const d = new Date(`${isoDate.slice(0, 7)}-01T00:00:00Z`)
  return { month: MONTHS[d.getUTCMonth()], year: d.getUTCFullYear(), recordDate: `${isoDate.slice(0, 7)}-01` }
}

const num = (v: number | string | null | undefined) => (v == null ? null : Number(v))

function mapConsumption(d: Tables['consumption_history']['Row']): ConsumptionRecord {
  return {
    id: d.id,
    userId: d.user_id,
    recordDate: d.record_date,
    month: d.month,
    year: d.year,
    consumptionKwh: Number(d.consumption_kwh),
    peakDemandKw: num(d.peak_demand_kw),
    billAmount: Number(d.bill_amount),
    unitsImported: num(d.units_imported),
    unitsExported: num(d.units_exported),
    tariffRate: num(d.tariff_rate),
    source: d.source as ConsumptionRecord['source'],
    createdAt: d.created_at,
  }
}

function mapGeneration(d: Tables['solar_generation_history']['Row']): GenerationRecord {
  return {
    id: d.id,
    userId: d.user_id,
    recordDate: d.record_date,
    generationKwh: Number(d.generation_kwh),
    exportedKwh: Number(d.exported_kwh),
    selfConsumedKwh: Number(d.self_consumed_kwh),
    gridImportKwh: Number(d.grid_import_kwh),
    peakGenerationKw: num(d.peak_generation_kw),
    source: d.source as GenerationRecord['source'],
  }
}

/** The user's real consumption records (oldest first). Empty when none were entered — never synthesised. */
export async function getUserConsumptionHistory(userId?: string): Promise<ConsumptionRecord[]> {
  const supabase = await createSupabaseServerClient()
  const targetUserId = userId || (await requireUser()).id
  const { data, error } = await supabase
    .from('consumption_history')
    .select('*')
    .eq('user_id', targetUserId)
    .order('record_date', { ascending: true })
  if (error) throw new Error(`Failed to load consumption history: ${error.message}`)
  return (data ?? []).map(mapConsumption)
}

export async function upsertConsumptionRecords(
  entries: ConsumptionEntry[],
  source: 'user_entered' | 'bill_import' = 'user_entered'
): Promise<number> {
  if (entries.length === 0) return 0
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()
  const byMonth = new Map<string, Tables['consumption_history']['Insert']>()
  for (const e of entries) {
    const m = monthFields(e.recordDate)
    byMonth.set(m.recordDate, {
      user_id: user.id,
      record_date: m.recordDate,
      month: m.month,
      year: m.year,
      consumption_kwh: e.consumptionKwh,
      bill_amount: e.billAmount,
      peak_demand_kw: e.peakDemandKw ?? null,
      units_imported: e.consumptionKwh,
      units_exported: e.unitsExported ?? 0,
      tariff_rate: e.tariffRate ?? (e.consumptionKwh > 0 ? Number((e.billAmount / e.consumptionKwh).toFixed(2)) : null),
      source,
    })
  }
  const { error } = await supabase
    .from('consumption_history')
    .upsert([...byMonth.values()], { onConflict: 'user_id,month,year' })
  if (error) throw new Error(`Failed to save consumption: ${error.message}`)
  return byMonth.size
}

/** Logged generation for the last `days` days (oldest first). */
export async function getGenerationHistory(days = 30, userId?: string): Promise<GenerationRecord[]> {
  const supabase = await createSupabaseServerClient()
  const targetUserId = userId || (await requireUser()).id
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('solar_generation_history')
    .select('*')
    .eq('user_id', targetUserId)
    .gte('record_date', since)
    .order('record_date', { ascending: true })
  if (error) throw new Error(`Failed to load generation history: ${error.message}`)
  return (data ?? []).map(mapGeneration)
}

export async function upsertGenerationRecords(
  entries: GenerationEntry[],
  source: 'manual_log' | 'inverter_telemetry' = 'manual_log'
): Promise<number> {
  if (entries.length === 0) return 0
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()
  const system = await getActiveSolarSystem(user.id)

  const byDate = new Map<string, Tables['solar_generation_history']['Insert']>()
  for (const e of entries) {
    byDate.set(e.recordDate, {
      user_id: user.id,
      system_id: system?.id ?? null,
      record_date: e.recordDate,
      generation_kwh: e.generationKwh,
      exported_kwh: e.exportedKwh,
      self_consumed_kwh: Number((e.generationKwh - e.exportedKwh).toFixed(3)),
      grid_import_kwh: e.gridImportKwh,
      peak_generation_kw: e.peakGenerationKw ?? null,
      source,
    })
  }
  const { error } = await supabase
    .from('solar_generation_history')
    .upsert([...byDate.values()], { onConflict: 'user_id,record_date' })
  if (error) throw new Error(`Failed to save generation: ${error.message}`)
  return byDate.size
}

export async function getActiveSolarSystem(userId?: string): Promise<SolarSystemRecord | null> {
  const supabase = await createSupabaseServerClient()
  const targetUserId = userId || (await requireUser()).id
  const { data, error } = await supabase
    .from('solar_systems')
    .select('*')
    .eq('user_id', targetUserId)
    .in('system_status', ['installed', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Failed to load solar system: ${error.message}`)
  if (!data) return null
  return {
    id: data.id,
    capacityKw: Number(data.capacity_kw),
    panelCount: data.panel_count,
    panelWattage: data.panel_wattage,
    inverterCapacityKw: num(data.inverter_capacity_kw),
    installationDate: data.installation_date,
    status: data.system_status,
  }
}

/**
 * Regional reference statistics from public.regional_statistics. Returns null when the
 * table has no row for the district — callers must not fall back to invented figures.
 */
export async function getRegionalStatistics(district = 'Hyderabad'): Promise<RegionalStatRecord | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('regional_statistics')
    .select('*')
    .or(`district.ilike.${district.replace(/[,()%]/g, '')},city.ilike.${district.replace(/[,()%]/g, '')}`)
    .order('record_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Failed to load regional statistics: ${error.message}`)
  if (!data) return null
  return {
    id: data.id,
    state: data.state,
    district: data.district,
    city: data.city,
    pincode: data.pincode,
    recordDate: data.record_date,
    averageSolarIrradiance: Number(data.average_solar_irradiance),
    averageGenerationPerKw: Number(data.average_generation_per_kw),
    averageMonthlyConsumption: Number(data.average_monthly_consumption),
    averageElectricityTariff: Number(data.average_electricity_tariff),
    averageRoofArea: Number(data.average_roof_area),
    adoptionRate: Number(data.adoption_rate),
    installedCapacityMw: Number(data.installed_capacity_mw),
    averageSystemSizeKw: Number(data.average_system_size_kw),
    averagePaybackYears: Number(data.average_payback_years),
    averageMonthlySavings: Number(data.average_monthly_savings),
    co2ReductionTonnes: Number(data.co2_reduction_tonnes),
    source: data.source,
  }
}

function mapScenario(d: Tables['saved_scenarios']['Row']): SavedScenario {
  return {
    id: d.id,
    userId: d.user_id,
    name: d.name,
    monthlyConsumptionKwh: Number(d.monthly_consumption_kwh),
    monthlyBillInr: Number(d.monthly_bill_inr),
    roofAreaSqft: Number(d.roof_area_sqft),
    tariffInr: Number(d.tariff_inr),
    capacityKw: Number(d.capacity_kw),
    subsidyInr: Number(d.subsidy_inr),
    shadingLevel: d.shading_level,
    calculatedSavingsInr: Number(d.calculated_savings_inr),
    calculatedPaybackYears: Number(d.calculated_payback_years),
    createdAt: d.created_at,
  }
}

export async function getSavedScenarios(): Promise<SavedScenario[]> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('saved_scenarios')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Failed to load scenarios: ${error.message}`)
  return (data ?? []).map(mapScenario)
}

export async function saveScenario(
  input: Omit<SavedScenario, 'id' | 'userId' | 'createdAt'>
): Promise<SavedScenario> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('saved_scenarios')
    .insert({
      user_id: user.id,
      name: input.name,
      monthly_consumption_kwh: input.monthlyConsumptionKwh,
      monthly_bill_inr: input.monthlyBillInr,
      roof_area_sqft: input.roofAreaSqft,
      tariff_inr: input.tariffInr,
      capacity_kw: input.capacityKw,
      subsidy_inr: input.subsidyInr,
      shading_level: input.shadingLevel,
      calculated_savings_inr: input.calculatedSavingsInr,
      calculated_payback_years: input.calculatedPaybackYears,
    })
    .select()
    .single()
  if (error || !data) throw new Error(`Failed to save scenario: ${error?.message}`)
  return mapScenario(data)
}
