import mqtt from 'mqtt'
import { env, type Sample, type Source } from '../types.js'

/** Reads a numeric field from a JSON payload, supporting dotted paths such as "ENERGY.Power" (Tasmota). */
export function pick(obj: unknown, path: string): number | undefined {
  let cur: unknown = obj
  for (const key of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  const n = typeof cur === 'string' ? Number(cur) : cur
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined
}

export function toSample(payload: unknown, fields: { power: string; energy: string; ts: string }, now = new Date()): Sample | null {
  const power = pick(payload, fields.power)
  const energy = pick(payload, fields.energy)
  if (power == null && energy == null) return null
  const rawTs = (payload as Record<string, unknown>)?.[fields.ts]
  const ts = typeof rawTs === 'string' && !Number.isNaN(Date.parse(rawTs)) ? new Date(rawTs).toISOString() : now.toISOString()
  return { ts, power_w: power, energy_wh_total: energy }
}

/** Subscribes to a broker topic and turns each JSON message into a sample. */
export function createMqttSource(): Source {
  const fields = {
    power: env('MQTT_POWER_FIELD', 'power_w'),
    energy: env('MQTT_ENERGY_FIELD', 'energy_wh_total'),
    ts: env('MQTT_TS_FIELD', 'ts'),
  }
  let client: mqtt.MqttClient | null = null
  return {
    name: `mqtt ${env('MQTT_URL')}`,
    async start(onSample) {
      client = mqtt.connect(env('MQTT_URL'), {
        username: process.env.MQTT_USERNAME || undefined,
        password: process.env.MQTT_PASSWORD || undefined,
        reconnectPeriod: 5000,
      })
      const topic = env('MQTT_TOPIC')
      client.on('connect', () => client!.subscribe(topic, { qos: 1 }))
      client.on('error', (err) => console.warn('[mqtt]', err.message))
      client.on('message', (_t, buf) => {
        try {
          const sample = toSample(JSON.parse(buf.toString('utf8')), fields)
          if (sample) onSample(sample)
        } catch {
          console.warn('[mqtt] ignored a non-JSON message')
        }
      })
    },
    async stop() {
      await client?.endAsync()
    },
  }
}
