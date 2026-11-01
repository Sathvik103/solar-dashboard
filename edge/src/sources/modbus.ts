import { env, num, type Sample, type Source } from '../types.js'

/**
 * Modbus TCP reader for SunSpec inverters (models 101/103). Values are stored as an integer plus a
 * signed scale-factor register: value = raw * 10^sf. Lifetime energy (WH) is an unsigned 32-bit acc32
 * spread over two registers. Unimplemented registers return 0xFFFF / 0x8000 and are ignored.
 */
type ModbusClient = {
  connectTCP(host: string, opts: { port: number }): Promise<void>
  setID(id: number): void
  setTimeout(ms: number): void
  readHoldingRegisters(addr: number, len: number): Promise<{ data: number[] }>
  close(cb: () => void): void
  isOpen: boolean
}

const toInt16 = (v: number) => (v > 0x7fff ? v - 0x10000 : v)

// SunSpec "not implemented": 0x8000 for int16 values and scale factors, 0xFFFF for uint16 values.
export function scaled(raw: number, sfRaw: number, signed = true): number | undefined {
  if (sfRaw === 0x8000) return undefined
  if (signed ? raw === 0x8000 : raw === 0xffff) return undefined
  const value = signed ? toInt16(raw) : raw
  return value * Math.pow(10, toInt16(sfRaw))
}

export function acc32(hi: number, lo: number): number | undefined {
  if (hi === 0xffff && lo === 0xffff) return undefined
  return hi * 0x10000 + lo
}

export async function createModbusSource(): Promise<Source> {
  // Optional dependency: only needed when SOURCE=modbus.
  const mod = (await import('modbus-serial')) as unknown as { default: new () => ModbusClient }
  const client = new mod.default()
  const host = env('MODBUS_HOST')
  const port = num('MODBUS_PORT', 502)
  const reg = (name: string, fallback: number) => num(`MODBUS_REG_${name}`, fallback)
  const R = {
    W: reg('W', 40083), W_SF: reg('W_SF', 40084),
    HZ: reg('HZ', 40085), HZ_SF: reg('HZ_SF', 40086),
    V: reg('V', 40079), V_SF: reg('V_SF', 40082),
    WH: reg('WH', 40093), WH_SF: reg('WH_SF', 40095),
    TEMP: reg('TEMP', 40102), TEMP_SF: reg('TEMP_SF', 40106),
  }
  const start = Math.min(...Object.values(R))
  const end = Math.max(...Object.values(R)) + 1
  if (end - start > 120) throw new Error('Configured Modbus registers span more than 120 words; read them in one block or adjust')

  const connect = async () => {
    if (client.isOpen) return
    await client.connectTCP(host, { port })
    client.setID(num('MODBUS_UNIT_ID', 1))
    client.setTimeout(5000)
  }

  return {
    name: `modbus ${host}:${port}`,
    async read(): Promise<Sample | null> {
      await connect()
      const { data } = await client.readHoldingRegisters(start, end - start)
      const at = (addr: number) => data[addr - start]
      const whRaw = acc32(at(R.WH), at(R.WH + 1))
      const whSf = at(R.WH_SF)
      return {
        ts: new Date().toISOString(),
        power_w: scaled(at(R.W), at(R.W_SF)),
        frequency_hz: scaled(at(R.HZ), at(R.HZ_SF), false),
        voltage_v: scaled(at(R.V), at(R.V_SF), false),
        energy_wh_total: whRaw != null && whSf !== 0x8000 ? whRaw * Math.pow(10, toInt16(whSf)) : undefined,
        temperature_c: scaled(at(R.TEMP), at(R.TEMP_SF)),
      }
    },
    async stop() {
      if (client.isOpen) await new Promise<void>((r) => client.close(() => r()))
    },
  }
}
