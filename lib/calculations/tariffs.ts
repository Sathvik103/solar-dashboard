/**
 * tariffs.ts — Telangana electricity tariff slabs & net metering calculation
 * Source: TGERC Retail Supply Tariff Order for TSSPDCL & TSNPDCL
 */

export type TariffCategory = 'domestic' | 'commercial' | 'industrial'

export type SlabBreakdown = {
  slab: string
  units: number
  ratePerUnit: number
  totalInr: number
}

export type TariffCalculationResult = {
  monthlyUnitsKwh: number
  category: TariffCategory
  slabs: SlabBreakdown[]
  energyChargesInr: number
  fixedChargesInr: number
  electricityDutyInr: number
  estimatedTotalBillInr: number
  effectiveRatePerUnit: number
}

/**
 * Calculates domestic bill based on Telangana LT-1 telescopic slabs.
 */
export function calculateTelanganaTariff(
  monthlyUnitsKwh: number,
  category: TariffCategory = 'domestic'
): TariffCalculationResult {
  const slabs: SlabBreakdown[] = []
  let remainingUnits = Math.max(0, monthlyUnitsKwh)
  let energyCharges = 0

  if (category === 'domestic') {
    // Domestic LT-1 (Group B/C standard telescopic rates)
    // 0-100 units @ ₹3.40
    // 101-200 units @ ₹4.80
    // 201-300 units @ ₹7.70
    // 301-400 units @ ₹9.00
    // 401-500 units @ ₹9.50
    // >500 units @ ₹10.00
    const slabDefs = [
      { limit: 100, rate: 3.4 },
      { limit: 100, rate: 4.8 },
      { limit: 100, rate: 7.7 },
      { limit: 100, rate: 9.0 },
      { limit: 100, rate: 9.5 },
      { limit: Infinity, rate: 10.0 },
    ]

    for (let i = 0; i < slabDefs.length; i++) {
      if (remainingUnits <= 0) break
      const currentLimit = slabDefs[i].limit
      const unitsInSlab = Math.min(remainingUnits, currentLimit)
      const cost = unitsInSlab * slabDefs[i].rate
      energyCharges += cost
      slabs.push({
        slab: i === 0 ? '0-100 kWh' : i === 1 ? '101-200 kWh' : i === 2 ? '201-300 kWh' : i === 3 ? '301-400 kWh' : i === 4 ? '401-500 kWh' : '>500 kWh',
        units: unitsInSlab,
        ratePerUnit: slabDefs[i].rate,
        totalInr: parseFloat(cost.toFixed(2)),
      })
      remainingUnits -= unitsInSlab
    }
  } else {
    // Commercial LT-2 flat benchmark (~₹11.50/unit)
    const cost = remainingUnits * 11.5
    energyCharges = cost
    slabs.push({
      slab: 'All units (Commercial LT-2)',
      units: remainingUnits,
      ratePerUnit: 11.5,
      totalInr: parseFloat(cost.toFixed(2)),
    })
  }

  const fixedCharges = category === 'domestic' ? 80 : 250
  const electricityDuty = parseFloat((energyCharges * 0.06).toFixed(2)) // ~6% duty
  const estimatedTotalBill = parseFloat((energyCharges + fixedCharges + electricityDuty).toFixed(2))
  const effectiveRate =
    monthlyUnitsKwh > 0 ? parseFloat((estimatedTotalBill / monthlyUnitsKwh).toFixed(2)) : 7.5

  return {
    monthlyUnitsKwh,
    category,
    slabs,
    energyChargesInr: parseFloat(energyCharges.toFixed(2)),
    fixedChargesInr: fixedCharges,
    electricityDutyInr: electricityDuty,
    estimatedTotalBillInr: estimatedTotalBill,
    effectiveRatePerUnit: effectiveRate,
  }
}
