import { DiskBuffer } from './buffer.js'
import { uploadBatch } from './uploader.js'
import { env, num, type Config, type Sample, type Source } from './types.js'
import { createMqttSource } from './sources/mqtt.js'
import { createSimulatorSource } from './sources/simulator.js'

/**
 * SolarIntel edge agent.
 *
 *   source (poll or push) -> disk buffer (JSON lines) -> batched upload with backoff -> /api/v1/telemetry
 *
 * The buffer is the source of truth: a sample is only removed after the server acknowledges the batch
 * that contained it. Restarting the agent resumes from the buffer.
 */
function loadConfig(): Config {
  const source = env('SOURCE', 'modbus')
  if (source !== 'modbus' && source !== 'mqtt' && source !== 'simulator') throw new Error('SOURCE must be modbus, mqtt or simulator')
  const token = env('DEVICE_TOKEN')
  if (!/^sdt_[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('DEVICE_TOKEN does not look like a SolarIntel device token')
  return {
    url: env('SOLARINTEL_URL'),
    token,
    source,
    intervalS: num('INTERVAL_SECONDS', 300),
    batchSize: Math.min(1000, num('BATCH_SIZE', 200)),
    bufferFile: env('BUFFER_FILE', './data/buffer.jsonl'),
    bufferMax: num('BUFFER_MAX_SAMPLES', 50_000),
  }
}

async function createSource(kind: Config['source']): Promise<Source> {
  if (kind === 'mqtt') return createMqttSource()
  if (kind === 'simulator') return createSimulatorSource()
  const { createModbusSource } = await import('./sources/modbus.js')
  return createModbusSource()
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const log = (...args: unknown[]) => console.log(new Date().toISOString(), ...args)

async function main() {
  const cfg = loadConfig()
  const buffer = new DiskBuffer(cfg.bufferFile, cfg.bufferMax)
  const source = await createSource(cfg.source)
  let stopping = false
  let pending: Sample[] = []

  log(`starting: ${source.name}, every ${cfg.intervalS}s -> ${cfg.url}`)

  const flushPending = async () => {
    if (!pending.length) return
    const batch = pending
    pending = []
    await buffer.append(batch)
  }

  // Push-based sources (MQTT) hand samples over as they arrive.
  if (source.start) await source.start((s) => pending.push(s))

  // Poll loop for pull-based sources (Modbus, simulator).
  const poll = async () => {
    while (!stopping && source.read) {
      const t0 = Date.now()
      try {
        const s = await source.read()
        if (s) pending.push(s)
      } catch (err) {
        log('read failed:', (err as Error).message)
      }
      await sleep(Math.max(1000, cfg.intervalS * 1000 - (Date.now() - t0)))
    }
  }

  // Upload loop: drains the disk buffer in batches, backing off on failures.
  const upload = async () => {
    let attempt = 0
    while (!stopping) {
      await flushPending()
      const all = await buffer.readAll()
      if (!all.length) {
        await sleep(Math.min(30_000, cfg.intervalS * 1000))
        continue
      }
      const batch = all.slice(0, cfg.batchSize)
      const outcome = await uploadBatch(cfg.url, cfg.token, batch, attempt)
      if (outcome.kind === 'ok') {
        attempt = 0
        const dropped = await buffer.replace(all.slice(batch.length))
        log(`uploaded ${batch.length}: accepted ${outcome.accepted}, duplicates ${outcome.duplicates}, rejected ${outcome.rejected}` + (dropped ? `, dropped ${dropped} oldest (buffer full)` : ''))
        if (all.length > batch.length) continue
      } else if (outcome.kind === 'retry') {
        attempt += 1
        log(`upload deferred (${outcome.reason}); retrying in ${Math.round(outcome.delayMs / 1000)}s, ${all.length} buffered`)
        await sleep(outcome.delayMs)
        continue
      } else {
        log(`stopping uploads: ${outcome.reason}. Samples stay buffered; fix the token and restart.`)
        stopping = true
        break
      }
      await sleep(Math.min(30_000, cfg.intervalS * 1000))
    }
  }

  const shutdown = async () => {
    if (stopping) return
    stopping = true
    log('shutting down')
    await flushPending()
    await source.stop()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  await Promise.all([poll(), upload()])
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
