'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { archiveDevice, createDevice, revokeDeviceToken, rotateDeviceToken } from '@/lib/dal/devices'
import { errorMessage } from '@/lib/utils'

export type DeviceActionState = {
  error?: string
  /** Plaintext token, shown to the user once. */
  token?: string
  deviceId?: string
  deviceName?: string
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .optional()

const CreateDeviceSchema = z.object({
  name: z.string().trim().min(1, 'Give the device a name').max(60),
  kind: z.enum(['inverter', 'energy_meter', 'data_logger', 'gateway']),
  protocol: z.enum(['http', 'mqtt', 'modbus_tcp', 'vendor_cloud', 'simulator']),
  vendor: optionalText(60),
  model: optionalText(60),
  serialNumber: optionalText(80),
  capacityKw: z.coerce.number().positive().max(1000).nullable().optional(),
  reportingIntervalS: z.coerce.number().int().min(10).max(3600),
})

export async function createDeviceAction(
  _prev: DeviceActionState | undefined,
  formData: FormData
): Promise<DeviceActionState> {
  const parsed = CreateDeviceSchema.safeParse({
    name: formData.get('name'),
    kind: formData.get('kind'),
    protocol: formData.get('protocol'),
    vendor: formData.get('vendor') ?? '',
    model: formData.get('model') ?? '',
    serialNumber: formData.get('serialNumber') ?? '',
    capacityKw: formData.get('capacityKw') || null,
    reportingIntervalS: formData.get('reportingIntervalS') || 300,
  })
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join('; ') }
  try {
    const { device, token } = await createDevice(parsed.data)
    revalidatePath('/devices')
    return { token, deviceId: device.id, deviceName: device.name }
  } catch (err) {
    return { error: errorMessage(err) }
  }
}

export async function rotateDeviceTokenAction(
  _prev: DeviceActionState | undefined,
  formData: FormData
): Promise<DeviceActionState> {
  const id = z.string().uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Unknown device' }
  try {
    const token = await rotateDeviceToken(id.data)
    revalidatePath(`/devices/${id.data}`)
    return { token, deviceId: id.data }
  } catch (err) {
    return { error: errorMessage(err) }
  }
}

export async function archiveDeviceAction(formData: FormData): Promise<void> {
  const id = z.string().uuid().safeParse(formData.get('id'))
  if (!id.success) return
  await archiveDevice(id.data)
  revalidatePath('/devices')
}

export async function revokeDeviceTokenAction(formData: FormData): Promise<void> {
  const id = z.string().uuid().safeParse(formData.get('id'))
  if (!id.success) return
  await revokeDeviceToken(id.data)
  revalidatePath('/devices')
}
