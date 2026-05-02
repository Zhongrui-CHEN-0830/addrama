import { NextResponse } from 'next/server'
import { queryLibtvSession } from '@/lib/libtv'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params

  if (!sessionId) {
    return NextResponse.json({ status: 'error', error: 'missing sessionId' }, { status: 400 })
  }

  const result = await queryLibtvSession(sessionId)
  return NextResponse.json(result)
}
