import { z } from 'zod'

export const SolarProfileSchema = z.object({
  city: z.string().min(1, 'City is required').default('Hyderabad'),
  state: z.string().min(1, 'State is required').default('Telangana'),
  district: z.string().nullable().optional(),
  pincode: z
    .string()
    .regex(/^\d{6}$/, 'Pincode must be exactly 6 digits')
    .nullable()
    .optional()
    .or(z.literal('')),

  monthlyBillInr: z.coerce
    .number({ message: 'Must be a number' })
    .min(0, 'Monthly bill cannot be negative')
    .nullable()
    .optional(),

  monthlyUnitsKwh: z.coerce
    .number({ message: 'Must be a number' })
    .min(0, 'Monthly units cannot be negative')
    .nullable()
    .optional(),

  electricityTariffInr: z.coerce
    .number({ message: 'Must be a number' })
    .min(1, 'Tariff must be at least ₹1/kWh')
    .max(20, 'Tariff cannot exceed ₹20/kWh')
    .nullable()
    .optional(),

  roofAreaSqft: z.coerce
    .number({ message: 'Must be a number' })
    .positive('Roof area must be greater than 0')
    .max(10000, 'Roof area cannot exceed 10,000 sq ft')
    .nullable()
    .optional(),

  roofType: z
    .enum(['flat-rcc', 'flat-concrete', 'sloped-tile', 'metal-sheet', 'other'])
    .nullable()
    .optional(),

  roofOrientation: z
    .enum(['south', 'south-east', 'south-west', 'east', 'west', 'north', 'flat', 'other'])
    .nullable()
    .optional(),

  shadingLevel: z
    .enum(['none', 'low', 'medium', 'high', 'partial', 'heavy'])
    .nullable()
    .optional(),

  budgetInr: z.coerce
    .number({ message: 'Must be a number' })
    .min(0, 'Budget cannot be negative')
    .nullable()
    .optional(),

  preferredCapacityKw: z.coerce
    .number({ message: 'Must be a number' })
    .positive('Capacity must be greater than 0')
    .max(500, 'Preferred capacity cannot exceed 500 kW')
    .nullable()
    .optional(),

  batteryPreference: z
    .enum(['no-battery', 'add-battery-now', 'future-expansion', 'battery-backup', 'off-grid'])
    .default('no-battery'),
})

export type SolarProfileSchemaInput = z.infer<typeof SolarProfileSchema>
