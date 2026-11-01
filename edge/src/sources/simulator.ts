import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { num, type Sample, type Source } from '../types.js'

/**
 * Test source: models a panel array from live plane-of-array irradiance and temperature (Open-Meteo)
 * and keeps a lifetime energy counter on disk, so the pipeline can be exercised without hardware.
 * Register the device with protocol "Simulator" so its data is badged as simulated in the app.
 */
type Weather = { at: number; poa: number; temp: number }

export function powerW(poaWm2: number, tempC: number, capacityKw: number): number {
  if (poaWm2 <= 0) return 0
  const cell = tempC + ((45 - 20) / 800) * poaWm2
  const kw = capacityKw * (poaWm2 / 1000) * (1 - 0.0035 * (cell - 25)) * 0.9 * 0.97
  return Math.max(0, Math.min(kw, capacityKw)) * 1000
}

export function createSimulatorSource(stateFile = './data/simulator.json'): Source {
  const capacity = num('SIM_CAPACITY_KW', 3)
  const lat = num('SIM_LATITUDE', 17.385)
  const lon = num('SIM_LONGITUDE', 78.4867)
  let weather: Weather | null = null
  let energyWh = 0
  let lastTs = 0
  let loaded = false

  const refreshWeather = async () => {
    if (weather && Date.now() - weather.at < 10 * 60_000) return weather
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=global_tilted_irradiance,temperature_2m&tilt=17&azimuth=0`
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    const body = (await res.json()) as { current?: { global_tilted_irradiance?: number; temperature_2m?: number } }
    weather = { at: Date.now(), poa: body.current?.global_tilted_irradiance ?? 0, temp: body.current?.temperature_2m ?? 30 }
    return weather
  }

  return {
    name: `simulator ${capacity} kW at ${lat},${lon}`,
    async read(): Promise<Sample> {
      if (!loaded) {
        loaded = true
        try {
          const s = JSON.parse(await readFile(stateFile, 'utf8')) as { energyWh: number; lastTs: number }
          energyWh = s.energyWh
          lastTs = s.lastTs
        } catch {
          // First run.
        }
      }
      const w = await refreshWeather()
      // Small variation so the curve looks like a real meter, not a step function.
      const p = powerW(w.poa, w.temp, capacity) * (0.97 + Math.random() * 0.06)
      const now = Date.now()
      if (lastTs) energyWh += (p * Math.min(now - lastTs, 30 * 60_000)) / 3_600_000
      lastTs = now
      await mkdir('./data', { recursive: true })
      await writeFile(stateFile, JSON.stringify({ energyWh, lastTs }))
      return {
        ts: new Date(now).toISOString(),
        power_w: Math.round(p),
        energy_wh_total: Math.round(energyWh),
        temperature_c: Math.round(w.temp + (w.poa / 800) * 25),
        voltage_v: 228 + Math.round(Math.random() * 60) / 10,
        frequency_hz: 49.95 + Math.round(Math.random() * 10) / 100,
        status: 'simulated',
      }
    },
    async stop() {},
  }
}
