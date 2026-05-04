import { NextResponse } from 'next/server'
import { getLibtvAdJob, serializeLibtvAdJob } from '../../../../lib/libtv-ad-job-store'

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params

  if (!jobId) {
    return NextResponse.json({ status: 'error', error: 'missing jobId' }, { status: 400 })
  }

  const job = getLibtvAdJob(jobId)
  if (!job) {
    return NextResponse.json({ status: 'error', error: 'unknown jobId' }, { status: 404 })
  }

  return NextResponse.json(serializeLibtvAdJob(job))
}
