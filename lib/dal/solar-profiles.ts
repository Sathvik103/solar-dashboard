import 'server-only'

import { createSupabaseServerClient } from '@/lib/db/client'
import { requireUser } from '@/lib/auth/session'
import type { SolarProfile, SolarProfileInput, RoofType, RoofOrientation, ShadingLevel, BatteryPreference } from '@/lib/types/user'

function mapRowToDTO(row: any): SolarProfile {
  return {
    id: row.id,
    userId: row.user_id,
    city: row.city,
    state: row.state,
    district: row.district,
    pincode: row.pincode,
    monthlyBillInr: row.monthly_bill_inr != null ? Number(row.monthly_bill_inr) : null,
    monthlyUnitsKwh: row.monthly_units_kwh != null ? Number(row.monthly_units_kwh) : null,
    electricityTariffInr: row.electricity_tariff_inr != null ? Number(row.electricity_tariff_inr) : null,
    roofAreaSqft: row.roof_area_sqft != null ? Number(row.roof_area_sqft) : null,
    roofType: (row.roof_type as RoofType) || null,
    roofOrientation: (row.roof_orientation as RoofOrientation) || null,
    shadingLevel: (row.shading_level as ShadingLevel) || null,
    budgetInr: row.budget_inr != null ? Number(row.budget_inr) : null,
    preferredCapacityKw: row.preferred_capacity_kw != null ? Number(row.preferred_capacity_kw) : null,
    batteryPreference: (row.battery_preference as BatteryPreference) || 'no-battery',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getSolarProfile(userId: string): Promise<SolarProfile | null> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('solar_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      throw new Error('Failed to retrieve solar profile')
    }

    if (!data) {
      return null
    }

    return mapRowToDTO(data)
  } catch (err: any) {
    if (err.message === 'Failed to retrieve solar profile') throw err
    return null
  }
}

export async function upsertSolarProfile(
  userId: string,
  data: SolarProfileInput
): Promise<SolarProfile> {
  const currentUser = await requireUser()
  if (currentUser.id !== userId) {
    throw new Error('Unauthorized')
  }

  const supabase = await createSupabaseServerClient()

  const payload = {
    user_id: userId,
    city: data.city || 'Hyderabad',
    state: data.state || 'Telangana',
    district: data.district || null,
    pincode: data.pincode || null,
    monthly_bill_inr: data.monthlyBillInr,
    monthly_units_kwh: data.monthlyUnitsKwh,
    electricity_tariff_inr: data.electricityTariffInr,
    roof_area_sqft: data.roofAreaSqft,
    roof_type: data.roofType || null,
    roof_orientation: data.roofOrientation || null,
    shading_level: data.shadingLevel || null,
    budget_inr: data.budgetInr,
    preferred_capacity_kw: data.preferredCapacityKw,
    battery_preference: data.batteryPreference || 'no-battery',
    updated_at: new Date().toISOString(),
  }

  const { data: updated, error } = await supabase
    .from('solar_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()

  if (error || !updated) {
    throw new Error('Failed to save solar profile')
  }

  return mapRowToDTO(updated)
}
