import { z } from 'zod'
import { getSolarProfile } from '@/lib/dal/solar-profiles'

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
        message: 'No solar profile has been created by this user yet. Using regional Hyderabad benchmarks (350 kWh/mo, 800 sq.ft).',
        fallbackProfile: {
          city: 'Hyderabad',
          state: 'Telangana',
          monthlyUnitsKwh: 350,
          monthlyBillInr: 2800,
          roofAreaSqft: 800,
          roofType: 'flat-concrete',
          roofOrientation: 'south',
          shadingLevel: 'none',
        },
      }
    }

    return {
      found: true,
      profile: {
        city: profile.city,
        state: profile.state,
        district: profile.district,
        pincode: profile.pincode,
        monthlyUnitsKwh: profile.monthlyUnitsKwh || 350,
        monthlyBillInr: profile.monthlyBillInr || 2800,
        electricityTariffInr: profile.electricityTariffInr || 8.0,
        roofAreaSqft: profile.roofAreaSqft || 800,
        roofType: profile.roofType || 'flat-rcc',
        roofOrientation: profile.roofOrientation || 'south',
        shadingLevel: profile.shadingLevel || 'none',
        budgetInr: profile.budgetInr,
        preferredCapacityKw: profile.preferredCapacityKw,
        batteryPreference: profile.batteryPreference,
      },
    }
  } catch (error: any) {
    return {
      found: false,
      error: error.message,
    }
  }
}
