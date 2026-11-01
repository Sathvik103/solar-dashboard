import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DiskBuffer } from './buffer.js'
import { backoffMs, uploadBatch } from './uploader.js'
import { acc32, scaled } from './sources/modbus.js'
import { pick, toSample } from './sources/mqtt.js'
import { powerW } from './sources/simulator.js'

test('SunSpec scale factors and acc32 counters', () => {
  assert.equal(scaled(31200, 0x8000), undefined) // scale factor not implemented
  assert.equal(scaled(0x8000, 0), undefined) // int16 value not implemented
  assert.equal(scaled(0xffff, 0, false), undefined) // uint16 value not implemented
  assert.equal(scaled(3120, 0), 3120)
  assert.equal(scaled(31200, 0xffff), 3120) // sf = -1
  assert.equal(scaled(0xff9c, 0), -100) // signed int16
  assert.equal(acc32(0x0001, 0x0002), 65538)
})

test('MQTT payload mapping with dotted paths', () => {
  assert.equal(pick({ ENERGY: { Power: 812 } }, 'ENERGY.Power'), 812)
  const s = toSample({ power_w: '1500', energy_wh_total: 1000 }, { power: 'power_w', energy: 'energy_wh_total', ts: 'ts' }, new Date('2026-11-01T06:30:00Z'))
  assert.deepEqual(s, { ts: '2026-11-01T06:30:00.000Z', power_w: 1500, energy_wh_total: 1000 })
  assert.equal(toSample({ other: 1 }, { power: 'power_w', energy: 'e', ts: 'ts' }), null)
})

test('disk buffer survives torn lines and caps size', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'edge-'))
  const b = new DiskBuffer(join(dir, 'buf.jsonl'), 3)
  await b.append([{ ts: 'a' }, { ts: 'b' }])
  await b.append([{ ts: 'c' }, { ts: 'd' }])
  assert.equal((await b.readAll()).length, 4)
  const dropped = await b.replace(await b.readAll())
  assert.equal(dropped, 1)
  assert.deepEqual((await b.readAll()).map((s) => s.ts), ['b', 'c', 'd'])
})

test('upload classification and backoff', async () => {
  const fake = (status: number, body = '{}', headers: Record<string, string> = {}) =>
    (async () => new Response(body, { status, headers })) as unknown as typeof fetch
  assert.equal((await uploadBatch('http://x', 't', [], 0, fake(202, '{"accepted":2}'))).kind, 'ok')
  const limited = await uploadBatch('http://x', 't', [], 0, fake(429, '{}', { 'retry-after': '7' }))
  assert.deepEqual(limited.kind === 'retry' && limited.delayMs, 7000)
  assert.equal((await uploadBatch('http://x', 't', [], 0, fake(401))).kind, 'fatal')
  assert.equal((await uploadBatch('http://x', 't', [], 0, fake(503))).kind, 'retry')
  assert.ok(backoffMs(0, () => 0) >= 2500 && backoffMs(10, () => 1) <= 600_000)
})

test('simulator power model stays within capacity', () => {
  assert.equal(powerW(0, 30, 3), 0)
  const p = powerW(1000, 25, 3)
  assert.ok(p > 2000 && p <= 3000)
})
