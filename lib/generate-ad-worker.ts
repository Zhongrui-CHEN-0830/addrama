import type { VideoFrameInput } from '../types'
import { generateAdAnalysis } from './generate-ad-analysis'
import {
  markGenerateAdJobDone,
  markGenerateAdJobError,
  updateGenerateAdJobStage,
} from './generate-ad-job-store'

export interface GenerateAdWorkerInput {
  blobUrl: string
  frames: VideoFrameInput[]
  userPreferences: unknown
}

export async function runGenerateAdJob(
  jobId: string,
  input: GenerateAdWorkerInput
): Promise<void> {
  try {
    const result = await generateAdAnalysis(input, stage => {
      updateGenerateAdJobStage(jobId, stage === 'calling_kimi' ? 'calling_ai' : stage)
    })
    markGenerateAdJobDone(jobId, result)
  } catch (err) {
    const message = (err as Error).message || 'AI 分析失败：未知错误'
    markGenerateAdJobError(jobId, message)
    console.error('[generate-ad] job failed:', message)
  }
}
