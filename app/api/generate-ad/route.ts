import { NextResponse } from 'next/server'
import type { VideoFrameInput } from '../../../types'
import { generateAdAnalysis } from '../../../lib/generate-ad-analysis'
import { createGenerateAdJob, markGenerateAdJobDone, markGenerateAdJobError } from '../../../lib/generate-ad-job-store'

export const maxDuration = 10

function runGenerateAdJob(jobId: string, input: { blobUrl: string; frames: VideoFrameInput[]; userPreferences: unknown }) {
  void generateAdAnalysis(input)
    .then(result => {
      markGenerateAdJobDone(jobId, result)
    })
    .catch(err => {
      const message = (err as Error).message || 'AI 分析失败：未知错误'
      markGenerateAdJobError(jobId, message)
      console.error('[generate-ad] job failed:', message)
    })
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
  runGenerateAdJob(job.jobId, job.input)

  return NextResponse.json({ jobId: job.jobId, status: job.status }, { status: 202 })
}
