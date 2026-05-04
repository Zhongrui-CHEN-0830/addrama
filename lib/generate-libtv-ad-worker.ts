import type { LibtvAdJobInput } from './libtv-ad-job-store'
import { generateLibtvAdFromAnalysis } from './generate-libtv-ad'
import { markLibtvAdJobDone, markLibtvAdJobError, updateLibtvAdJobStage } from './libtv-ad-job-store'

export async function runLibtvAdJob(jobId: string, input: LibtvAdJobInput): Promise<void> {
  try {
    const result = await generateLibtvAdFromAnalysis(input.analysis, stage => updateLibtvAdJobStage(jobId, stage))
    markLibtvAdJobDone(jobId, result)
  } catch (err) {
    const message = (err as Error).message || 'Libtv 广告生成失败：未知错误'
    markLibtvAdJobError(jobId, message)
    console.error('[generate-libtv-ad] job failed:', message)
  }
}
