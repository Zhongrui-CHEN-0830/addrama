import { NextResponse } from 'next/server'
import { queryLibtvSession } from '@/lib/libtv'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params

  if (!sessionId) {
    return NextResponse.json({ status: 'error', error: 'missing sessionId' }, { status: 400 })
  }

  const url = new URL(request.url)
  const afterSeq = Number(url.searchParams.get('afterSeq') ?? '0')
  const projectUuid = url.searchParams.get('projectUuid') ?? ''
  const result = await queryLibtvSession(sessionId, Number.isFinite(afterSeq) ? afterSeq : 0, projectUuid)
  return NextResponse.json(result)
}
