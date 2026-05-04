import { after } from 'next/server'
import { NextResponse } from 'next/server'
import { isGenerateAdResponse } from '../../../lib/ad-result'
import { createLibtvAdJob } from '../../../lib/libtv-ad-job-store'
import { runLibtvAdJob } from '../../../lib/generate-libtv-ad-worker'

export const maxDuration = 60

function scheduleLibtvAdJob(task: () => Promise<void>) {
  try {
    after(task)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!message.includes('outside a request scope')) throw err
    queueMicrotask(() => { void task() })
  }
}

export async function POST(request: Request) {
  const { analysis } = await request.json() as { analysis?: unknown }

  if (!isGenerateAdResponse(analysis)) {
    return NextResponse.json({ error: 'valid analysis is required' }, { status: 400 })
  }

  const job = createLibtvAdJob({ analysis })
  scheduleLibtvAdJob(() => runLibtvAdJob(job.jobId, job.input))

  return NextResponse.json({ jobId: job.jobId, status: job.status, stage: job.stage, updatedAt: job.updatedAt }, { status: 202 })
}
