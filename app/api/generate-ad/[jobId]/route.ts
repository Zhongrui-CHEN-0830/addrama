import { NextResponse } from 'next/server'
import { getGenerateAdJob, serializeGenerateAdJob } from '../../../../lib/generate-ad-job-store'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  if (!jobId) {
    return NextResponse.json({ status: 'error', error: 'missing jobId' }, { status: 400 })
  }

  const job = getGenerateAdJob(jobId)
  if (!job) {
    return NextResponse.json({ status: 'error', error: 'unknown jobId' }, { status: 404 })
  }

  return NextResponse.json(serializeGenerateAdJob(job))
}
