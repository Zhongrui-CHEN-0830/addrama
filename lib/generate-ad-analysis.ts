import { analyzeVideoAndGenerateAd } from '../lib/kimi'
import { parseUserAdPreferences } from '../lib/user-preferences'
import { prepareKimiMediaInput } from '../lib/generate-ad-media'
import type { GenerateAdResponse, VideoFrameInput } from '../types'

export type GenerateAdAnalysisStage = 'preparing_media' | 'calling_kimi'

export interface GenerateAdAnalysisInput {
  blobUrl: string
  frames?: VideoFrameInput[]
  userPreferences?: unknown
}

export async function generateAdAnalysis(
  {
    blobUrl,
    frames = [],
    userPreferences = null,
  }: GenerateAdAnalysisInput,
  onStage: (stage: GenerateAdAnalysisStage) => void = () => undefined
): Promise<GenerateAdResponse> {
  onStage('preparing_media')
  const mediaInput = await prepareKimiMediaInput({ blobUrl, frames })
  const parsedPreferences = parseUserAdPreferences(
    typeof userPreferences === 'string' ? userPreferences : JSON.stringify(userPreferences)
  )

  try {
    onStage('calling_kimi')
    const kimiResult = await analyzeVideoAndGenerateAd(mediaInput.mediaBase64, mediaInput.mediaType, frames, parsedPreferences)
    return {
      ...kimiResult,
      sessionId: '',
      sessionIdB: undefined,
    }
  } catch (err) {
    throw new Error(`Kimi error: ${(err as Error).message}`)
  }
}
