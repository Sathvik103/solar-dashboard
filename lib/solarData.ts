export type HourlyOutput = {
  hour: string
  output: number 
}

export type DailyRecord = {
  date: string
  unitsGenerated: number 
  moneySaved: number 
}

export type DashboardData = {
  currentOutput: number 
  todayTotal: number 
  moneySavedToday: number 
  hourlyData: HourlyOutput[]
}
export const panelTypes = [
  {
    name: 'Polycrystalline',
    wattage: 330,
    costPerPanel: 8000,
    efficiency: 0.16,
    degradationRate: 0.008,
    lifespan: 25,
    color: '#3b82f6'
  },
  {
    name: 'Monocrystalline PERC',
    wattage: 400,
    costPerPanel: 12000,
    efficiency: 0.20,
    degradationRate: 0.005,
    lifespan: 25,
    color: '#16a34a'
  },
  {
    name: 'TOPCon',
    wattage: 450,
    costPerPanel: 14000,
    efficiency: 0.23,
    degradationRate: 0.003,
    lifespan: 30,
    color: '#f59e0b'
  },
]

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

  const todayTotal = hourlyData.reduce((sum, h) => sum + h.output, 0)
  const moneySavedToday = todayTotal * 8 

  return {
    currentOutput: 3.2 + Math.random() * 0.5, //randomness
    todayTotal: parseFloat(todayTotal.toFixed(2)),
    moneySavedToday: parseFloat(moneySavedToday.toFixed(2)),
    hourlyData,
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