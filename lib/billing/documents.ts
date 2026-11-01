import { z } from 'zod'

/**
 * Fields read from an uploaded bill or installer quote. The model is asked only to transcribe printed
 * values (null when absent), never to calculate; the user reviews every field before anything is saved.
 * Personal details (name, address, service number) are deliberately not requested.
 */
const kwh = z.number().min(0).max(100_000).nullable()
const inr = z.number().min(0).max(10_000_000).nullable()
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const BillExtractSchema = z.object({
  billingPeriodStart: isoDate.describe('Start of the billing/consumption period, YYYY-MM-DD'),
  billingPeriodEnd: isoDate.describe('End of the billing period (reading date), YYYY-MM-DD'),
  tariffCategory: z.string().max(40).nullable().describe('Category as printed, e.g. LT-I(C) Domestic'),
  importKwh: kwh.describe('Units imported from the grid (consumption) in the period'),
  exportKwh: kwh.describe('Units exported to the grid in the period (net-metering export), or null'),
  bankedOpeningKwh: kwh.describe('Banked/carried-forward credit units at the start of the period, or null'),
  bankedClosingKwh: kwh.describe('Banked/carried-forward credit units at the end of the period, or null'),
  billedUnits: kwh.describe('Net units actually billed, or null'),
  energyCharge: inr.describe('Energy charges in rupees'),
  fixedCharge: inr.describe('Fixed or customer charges in rupees'),
  electricityDuty: inr.describe('Electricity duty in rupees'),
  fuelSurcharge: z.number().min(-1_000_000).max(1_000_000).nullable().describe('Fuel surcharge adjustment (FSA/FCA) in rupees'),
  otherCharges: z.number().min(-1_000_000).max(1_000_000).nullable().describe('Any other charges or credits in rupees'),
  totalAmount: z.number().min(0).max(10_000_000).describe('Net amount payable for this period in rupees'),
  readable: z.boolean().describe('False if the document is not an electricity bill or is unreadable'),
})
export type BillExtract = z.infer<typeof BillExtractSchema>

export const QuoteExtractSchema = z.object({
  capacityKw: z.number().positive().max(1000).describe('System size in kW DC'),
  totalPriceInr: z.number().positive().max(100_000_000).describe('Total price quoted in rupees'),
  priceIsAfterSubsidy: z.boolean().nullable().describe('True if the total already deducts the subsidy'),
  subsidyStatedInr: inr.describe('Subsidy amount stated in the quote, or null'),
  moduleBrand: z.string().max(60).nullable(),
  moduleWattage: z.number().positive().max(1000).nullable().describe('Watts per panel'),
  moduleCount: z.number().int().positive().max(10_000).nullable(),
  dcrModules: z.boolean().nullable().describe('True if the quote says DCR / domestic content modules, false if non-DCR, else null'),
  inverterBrand: z.string().max(60).nullable(),
  inverterCapacityKw: z.number().positive().max(1000).nullable(),
  performanceWarrantyYears: z.number().int().min(0).max(50).nullable(),
  includesNetMeter: z.boolean().nullable(),
  readable: z.boolean().describe('False if the document is not a solar installation quote or is unreadable'),
})
export type QuoteExtract = z.infer<typeof QuoteExtractSchema>

export const DOCUMENT_KINDS = {
  bill: {
    schema: BillExtractSchema,
    prompt:
      'This is a Telangana electricity bill (TGSPDCL/TGNPDCL). Transcribe the requested values exactly as printed. Use null for any value that is not printed. Do not calculate or infer values. Dates as YYYY-MM-DD. Amounts as plain numbers without currency symbols.',
  },
  quote: {
    schema: QuoteExtractSchema,
    prompt:
      'This is an installer quotation for a rooftop solar system in India. Transcribe the requested values exactly as stated. Use null for anything not stated. Do not calculate or infer values. Amounts as plain numbers without currency symbols.',
  },
} as const

export type DocumentKind = keyof typeof DOCUMENT_KINDS

export const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
