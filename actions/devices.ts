'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createDeviceToken, revokeDeviceToken } from '@/lib/dal/devices'
import { errorMessage } from '@/lib/utils'

export type DeviceTokenActionState = {
  error?: string
  /** Plaintext token, shown to the user once. */
  token?: string
  name?: string
}

const NameSchema = z.string().trim().min(1, 'Give the device a name').max(60)

export async function createDeviceTokenAction(
  _prev: DeviceTokenActionState | undefined,
  formData: FormData
): Promise<DeviceTokenActionState> {
  const parsed = NameSchema.safeParse(formData.get('name'))
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  try {
    const { token, record } = await createDeviceToken(parsed.data)
    revalidatePath('/profile')
    return { token, name: record.name }
  } catch (err) {
    return { error: errorMessage(err) }
  }
}

export async function revokeDeviceTokenAction(formData: FormData): Promise<void> {
  const id = z.string().uuid().safeParse(formData.get('id'))
  if (!id.success) return
  await revokeDeviceToken(id.data)
  revalidatePath('/profile')
}
