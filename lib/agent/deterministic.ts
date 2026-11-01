/**
 * deterministic.ts — exact answers for questions the calculators fully determine.
 *
 * These skip the language model entirely: they are instant, free, and cannot be wrong in ways the
 * calculators are not. Anything with nuance (eligibility, procedure, comparisons) still goes to the model.
 */
import type { ToolExecutionRecord, UserIntent } from './types'

const inr = (n: unknown) => `₹${Math.round(Number(n)).toLocaleString('en-IN')}`

function output(tools: ToolExecutionRecord[], name: string): Record<string, unknown> | null {
  const t = tools.find((r) => r.tool === name && r.success)
  return t && t.output && typeof t.output === 'object' ? (t.output as Record<string, unknown>) : null
}

const SUBSIDY_ONLY = /^\s*(what|how much)\b[^?]*\bsubsid(y|ies)\b[^?]*\b\d+(\.\d+)?\s*kw\b[^?]*\??\s*$/i
const BILL_ONLY = /^\s*(what|how much)\b[^?]*\bbill\b[^?]*\b\d{2,5}\s*(units|kwh)\b[^?]*\??\s*$/i

export function deterministicAnswer(query: string, intent: UserIntent, tools: ToolExecutionRecord[]): string | null {
  if (intent !== 'financial_roi') return null
  // Mixed questions ("subsidy and payback", "and how do I apply") need the model.
  if (/\b(and|also|payback|apply|eligib|process|document|compare|why)\b/i.test(query)) return null

  const cost = output(tools, 'calculateSystemCost')
  if (cost && SUBSIDY_ONLY.test(query)) {
    const s = cost.subsidyDetails as Record<string, unknown>
    return [
      `For a ${cost.capacityKw} kW rooftop system the PM Surya Ghar subsidy is **${inr(s.eligibleSubsidyInr)}**.`,
      '',
      `- Rule: ₹30,000 per kW for the first 2 kW, ₹18,000 for the third kW, capped at ₹78,000.`,
      `- Estimated installed cost ${inr((cost.costBreakdown as Record<string, unknown>).totalGrossCostInr)}, so you would pay about **${inr(cost.netPayableCostInr)}**.`,
      '',
      'The installed cost is a market estimate; the subsidy is paid to your bank account after commissioning.',
    ].join('\n')
  }

  const tariff = output(tools, 'getTariffInformation')
  if (tariff && BILL_ONLY.test(query) && tariff.estimatedMonthlyBillInr != null) {
    return [
      `A month with ${tariff.monthlyUnitsKwh} units is billed on **${tariff.subcategory}** and comes to about **${inr(tariff.estimatedMonthlyBillInr)}** in energy and fixed charges.`,
      '',
      `- Your top slab rate is ₹${Number(tariff.marginalRatePerKwhInr).toFixed(2)} per unit, which is what each solar unit saves.`,
      '- Electricity duty and fuel surcharge are added by the DISCOM on top of this.',
    ].join('\n')
  }
  return null
}
