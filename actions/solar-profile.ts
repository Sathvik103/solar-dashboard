'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/session'
import { SolarProfileSchema, type SolarProfileSchemaInput } from '@/lib/validations/solar-profile'
import { upsertSolarProfile } from '@/lib/dal/solar-profiles'
import type { SolarProfileInput } from '@/lib/types/user'

export type ProfileActionState = {
  errors?: Partial<Record<keyof SolarProfileSchemaInput, string[]>> & {
    general?: string[]
  }
  success?: boolean
}

export async function upsertSolarProfileAction(
  prevState: ProfileActionState | undefined,
  formData: FormData
): Promise<ProfileActionState> {
  let user
  try {
    user = await requireUser()
  } catch {
    return {
      errors: {
        general: ['Unauthorized'],
      },
    }
  }

  const rawData = {
    city: formData.get('city') || 'Hyderabad',
    state: formData.get('state') || 'Telangana',
    district: formData.get('district') || null,
    pincode: formData.get('pincode') || null,
    monthlyBillInr: formData.get('monthlyBillInr') || null,
    monthlyUnitsKwh: formData.get('monthlyUnitsKwh') || null,
    electricityTariffInr: formData.get('electricityTariffInr') || null,
    roofAreaSqft: formData.get('roofAreaSqft') || null,
    roofType: formData.get('roofType') || null,
    roofOrientation: formData.get('roofOrientation') || null,
    shadingLevel: formData.get('shadingLevel') || null,
    budgetInr: formData.get('budgetInr') || null,
    preferredCapacityKw: formData.get('preferredCapacityKw') || null,
    batteryPreference: formData.get('batteryPreference') || 'no-battery',
  }

  const parseResult = SolarProfileSchema.safeParse(rawData)
  if (!parseResult.success) {
    return {
      errors: parseResult.error.flatten().fieldErrors,
    }
  }

  const profileInput: SolarProfileInput = {
    city: parseResult.data.city,
    state: parseResult.data.state,
    district: parseResult.data.district || null,
    pincode: parseResult.data.pincode || null,
    monthlyBillInr: parseResult.data.monthlyBillInr ?? null,
    monthlyUnitsKwh: parseResult.data.monthlyUnitsKwh ?? null,
    electricityTariffInr: parseResult.data.electricityTariffInr ?? null,
    roofAreaSqft: parseResult.data.roofAreaSqft ?? null,
    roofType: (parseResult.data.roofType as any) || null,
    roofOrientation: (parseResult.data.roofOrientation as any) || null,
    shadingLevel: (parseResult.data.shadingLevel as any) || null,
    budgetInr: parseResult.data.budgetInr ?? null,
    preferredCapacityKw: parseResult.data.preferredCapacityKw ?? null,
    batteryPreference: (parseResult.data.batteryPreference as any) || 'no-battery',
  }

  try {
    await upsertSolarProfile(user.id, profileInput)
    revalidatePath('/profile')
    return {
      success: true,
    }
  } catch {
    return {
      errors: {
        general: ['Failed to save profile. Please try again.'],
      },
    }
  }
}
