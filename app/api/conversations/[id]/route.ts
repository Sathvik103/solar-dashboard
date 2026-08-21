import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/dal/users'
import {
  getConversationMessages,
  deleteConversation,
} from '@/lib/dal/conversations'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const params = await props.params
    const messages = await getConversationMessages(params.id)
    return NextResponse.json({ messages })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const params = await props.params
    await deleteConversation(params.id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 })
  }
}
