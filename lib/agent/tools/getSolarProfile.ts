import { z } from 'zod'
import { getSolarProfile } from '@/lib/dal/solar-profiles'
import { errorMessage } from '@/lib/utils'

export const GetSolarProfileSchema = z.object({
  userId: z.string().describe('User ID to fetch solar profile for'),
})

export type GetSolarProfileInput = z.infer<typeof GetSolarProfileSchema>

export async function getSolarProfileTool(input: GetSolarProfileInput) {
  try {
    const profile = await getSolarProfile(input.userId)
    if (!profile) {
      return {
        found: false,
        message: 'The user has not created a solar profile yet. Ask for monthly units and roof area; do not assume values.',
      }
    }

    return {
      found: true,
      profile: {
        city: profile.city,
        state: profile.state,
        district: profile.district,
        pincode: profile.pincode,
        monthlyUnitsKwh: profile.monthlyUnitsKwh,
        monthlyBillInr: profile.monthlyBillInr,
        electricityTariffInr: profile.electricityTariffInr,
        roofAreaSqft: profile.roofAreaSqft,
        roofType: profile.roofType,
        roofOrientation: profile.roofOrientation,
        shadingLevel: profile.shadingLevel,
        budgetInr: profile.budgetInr,
        preferredCapacityKw: profile.preferredCapacityKw,
        batteryPreference: profile.batteryPreference,
      },
      missingFields: (['monthlyUnitsKwh', 'roofAreaSqft', 'electricityTariffInr'] as const).filter(
        (k) => profile[k] == null
      ),
    }
  } catch (error) {
    return {
      found: false,
      error: errorMessage(error),
    }
  }
}
