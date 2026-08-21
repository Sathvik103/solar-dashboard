import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/dal/users'
import {
  listUserConversations,
  createConversation,
} from '@/lib/dal/conversations'

export async function GET() {
  try {
    await requireUser()
    const conversations = await listUserConversations()
    return NextResponse.json({ conversations })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    await requireUser()
    let title = 'New Solar Consultation'
    try {
      const body = await request.json()
      if (body.title) title = body.title
    } catch {
      // Default title
    }

    const conversation = await createConversation(title)
    return NextResponse.json({ conversation })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 })
  }
}
