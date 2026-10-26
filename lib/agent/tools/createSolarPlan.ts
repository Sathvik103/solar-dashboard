import { z } from 'zod'
import { calculateOptimalSystemSize } from '@/lib/calculations/systemSizing'
import { searchKnowledgeBase } from '@/lib/rag/retrieval'

export const CreateSolarPlanSchema = z.object({
  monthlyUnitsKwh: z.number().min(20).describe('Monthly consumption in kWh'),
  monthlyBillInr: z.number().optional().describe('Current monthly electricity bill in INR'),
  roofAreaSqft: z.number().optional().describe('Roof area in sq.ft (omit if unknown)'),
  city: z.string().default('Hyderabad').describe('City location'),
})

export type CreateSolarPlanInput = z.infer<typeof CreateSolarPlanSchema>

export async function createSolarPlanTool(input: CreateSolarPlanInput) {
  const sizing = calculateOptimalSystemSize({
    monthlyUnitsKwh: input.monthlyUnitsKwh,
    monthlyBillInr: input.monthlyBillInr,
    roofAreaSqft: input.roofAreaSqft,
  })

  // Retrieve relevant net-metering and subsidy policy chunks
  let policyChunks: { title: string; organization: string; url: string; section: string | null }[] = []
  try {
    const results = await searchKnowledgeBase(
      'rooftop solar subsidy net metering application procedure Telangana',
      { topK: 3, similarityThreshold: 0.25 }
    )
    policyChunks = results.map((r) => ({
      title: r.source.title,
      organization: r.source.organization,
      url: r.source.sourceUrl,
      section: r.sectionTitle,
    }))
  } catch {
    policyChunks = []
  }

  return {
    proposalSummary: {
      location: `${input.city}, Telangana`,
      recommendedSystemSizeKw: sizing.recommendedCapacityKw,
      estimatedGrossCostInr: sizing.estimatedGrossCostInr,
      pmSuryaGharSubsidyInr: sizing.subsidyAmountInr,
      netInvestmentInr: sizing.netCostInr,
      estimatedAnnualSavingsInr: sizing.estimatedAnnualSavingsInr,
      paybackPeriodYears: sizing.paybackPeriodYears,
      firstYearBillOffsetPercent: sizing.coveragePercentage,
      annualCo2OffsetKg: sizing.annualCo2AvoidedKg,
      equivalentTreesPlanted: sizing.treesEquivalentPlanted,
    },
    implementationSteps: [
      {
        step: 1,
        title: 'Feasibility Check & Registration',
        description: 'Register on the national PM Surya Ghar portal (pmsuryaghar.gov.in) and submit feasibility application to TSSPDCL.',
      },
      {
        step: 2,
        title: 'Vendor Selection & Installation',
        description: 'Select an empanelled vendor with ALMM-approved solar modules and BIS-compliant inverters with anti-islanding protection.',
      },
      {
        step: 3,
        title: 'Inspection & Bi-directional Net Metering',
        description: 'TSSPDCL / TGREDCO conducts joint inspection, installs bi-directional DLMS net meter, and issues commissioning certificate.',
      },
      {
        step: 4,
        title: 'Direct Subsidy Credit (DBT)',
        description: 'Central Financial Assistance (CFA) is deposited directly into your Aadhaar-linked bank account within 30 days.',
      },
    ],
    requiredDocuments: [
      'Latest TSSPDCL Electricity Bill Receipt',
      'Proof of property ownership (Registry / Municipal Tax receipt)',
      'Identity Proof (Aadhaar Card / PAN Card)',
      'Site Layout Plan & Single Line Diagram (provided by installer)',
      'Canceled Cheque / Bank Account Details for DBT Subsidy',
    ],
    governingRegulations: policyChunks,
  }
}
