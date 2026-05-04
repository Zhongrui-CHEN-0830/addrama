import { after } from 'next/server'
import { NextResponse } from 'next/server'
import type { VideoFrameInput } from '../../../types'
import { createGenerateAdJob } from '../../../lib/generate-ad-job-store'
import { runGenerateAdJob } from '../../../lib/generate-ad-worker'

export const maxDuration = 60

function scheduleGenerateAdJob(task: () => Promise<void>) {
  try {
    after(task)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!message.includes('outside a request scope')) throw err
    // Unit tests call route handlers directly without Next.js request async storage.
    // Fall back to a microtask so route behavior remains testable outside Next.
    queueMicrotask(() => {
      void task()
    })
  }
}

export async function POST(request: Request) {
  const { blobUrl, frames = [], userPreferences = null } = await request.json() as {
    blobUrl: string
    frames?: VideoFrameInput[]
    userPreferences?: unknown
  }

  if (!blobUrl) {
    return NextResponse.json({ error: 'blobUrl is required' }, { status: 400 })
  }

  const job = createGenerateAdJob({ blobUrl, frames, userPreferences })
  scheduleGenerateAdJob(() => runGenerateAdJob(job.jobId, job.input))

  return NextResponse.json({ jobId: job.jobId, status: job.status, stage: job.stage, updatedAt: job.updatedAt }, { status: 202 })
}
