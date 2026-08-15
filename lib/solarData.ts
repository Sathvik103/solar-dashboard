/**
 * MOCK DATA — Phase 1 static demo only.
 *
 * This file contains hard-coded, randomly generated solar data for the
 * prototype dashboard. It is NOT a source of truth and will NOT be used
 * for any real user calculations.
 *
 * Real per-user data will come from:
 *   - public.solar_profiles  (Phase 2+)
 *   - knowledge base / documents table (Phase 3+)
 *
 * Tariff values (DEMO_TARIFF_INR_PER_KWH, DEMO_NET_METERING_RATE_INR) are
 * interim hard-coded constants specific to the Hyderabad / TSSPDCL demo.
 * They will be replaced by authoritative knowledge-base data in Phase 3.
 * Do NOT use these values as inputs to real financial calculations.
 */

// ---------------------------------------------------------------------------
// Demo tariff constants — Hyderabad / TSSPDCL (interim, NOT authoritative)
// ---------------------------------------------------------------------------

/** Demo electricity tariff: ₹8/kWh (TSSPDCL residential slab — approximate) */
export const DEMO_TARIFF_INR_PER_KWH = 8

/** Demo net metering buyback rate: ₹3.5/unit (TSSPDCL govt rate — approximate) */
export const DEMO_NET_METERING_RATE_INR = 3.5

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HourlyOutput = {
  hour: string
  output: number
}

export type DailyRecord = {
  date: string
  unitsGenerated: number
  moneySaved: number
}

export type GridStatus = 'self-reliant' | 'selling' | 'buying'

export type DashboardData = {
  currentOutput: number
  todayTotal: number
  moneySavedToday: number
  hourlyData: HourlyOutput[]
  gridStatus: GridStatus
  netMeteringEarnings: number
  gridUnitsDrawn: number
  projectedMonthly: number
  actualMonthly: number
  predictedSunHoursNextMonth: number
  dailyConsumption: number
}

export function generateDashboardData(): DashboardData {
  const hourlyData: HourlyOutput[] = [
    { hour: '6am', output: 0.2 },
    { hour: '7am', output: 0.8 },
    { hour: '8am', output: 1.5 },
    { hour: '9am', output: 2.3 },
    { hour: '10am', output: 3.1 },
    { hour: '11am', output: 3.8 },
    { hour: '12pm', output: 4.2 },
    { hour: '1pm', output: 4.0 },
    { hour: '2pm', output: 3.7 },
    { hour: '3pm', output: 3.2 },
    { hour: '4pm', output: 2.4 },
    { hour: '5pm', output: 1.2 },
    { hour: '6pm', output: 0.3 },
  ]

  const todayTotal = parseFloat(
    hourlyData.reduce((sum, h) => sum + h.output, 0).toFixed(2)
  )

  const dailyConsumption = 28
  const excessOrDeficit = todayTotal - dailyConsumption

  let gridStatus: GridStatus
  let netMeteringEarnings = 0
  let gridUnitsDrawn = 0

  if (excessOrDeficit > 2) {
    gridStatus = 'selling'
    netMeteringEarnings = parseFloat((excessOrDeficit * DEMO_NET_METERING_RATE_INR).toFixed(2))
  } else if (excessOrDeficit < -2) {
    gridStatus = 'buying'
    gridUnitsDrawn = parseFloat(Math.abs(excessOrDeficit).toFixed(2))
  } else {
    gridStatus = 'self-reliant'
  }

  return {
    currentOutput: parseFloat((3.2 + Math.random() * 0.5).toFixed(2)),
    todayTotal,
    moneySavedToday: parseFloat((todayTotal * DEMO_TARIFF_INR_PER_KWH).toFixed(2)),
    hourlyData,
    gridStatus,
    netMeteringEarnings,
    gridUnitsDrawn,
    projectedMonthly: parseFloat((todayTotal * 30).toFixed(2)),
    actualMonthly: parseFloat((todayTotal * 18).toFixed(2)),
    predictedSunHoursNextMonth: 5.8,
    dailyConsumption,
  }
}

export function generateHistoryData(): DailyRecord[] {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return days.map((day) => {
    const units = parseFloat((20 + Math.random() * 10).toFixed(2))
    return {
      date: day,
      unitsGenerated: units,
      moneySaved: parseFloat((units * 8).toFixed(2)),
    }
  })
}

export const panelTypes = [
  {
    name: 'Polycrystalline',
    wattage: 330,
    costPerPanel: 8000,
    efficiency: 0.16,
    degradationRate: 0.008,
    lifespan: 25,
    color: '#3b82f6',
  },
  {
    name: 'Monocrystalline PERC',
    wattage: 400,
    costPerPanel: 12000,
    efficiency: 0.20,
    degradationRate: 0.005,
    lifespan: 25,
    color: '#16a34a',
  },
  {
    name: 'TOPCon',
    wattage: 450,
    costPerPanel: 14000,
    efficiency: 0.23,
    degradationRate: 0.003,
    lifespan: 30,
    color: '#f59e0b',
  },
]