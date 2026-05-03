import { analyzeVideoAndGenerateAd } from '../lib/kimi'
import { buildLibtvMessage, createLibtvSession, isLibtvConfigured } from '../lib/libtv'
import { parseUserAdPreferences } from '../lib/user-preferences'
import { MOCK_ADVERTISERS } from '../lib/mock-advertisers'
import type { GenerateAdResponse, VideoFrameInput } from '../types'
import { prepareKimiMediaInput } from '../lib/generate-ad-media'

export interface GenerateAdAnalysisInput {
  blobUrl: string
  frames?: VideoFrameInput[]
  userPreferences?: unknown
}

export async function generateAdAnalysis({
  blobUrl,
  frames = [],
  userPreferences = null,
}: GenerateAdAnalysisInput): Promise<GenerateAdResponse> {
  const mediaInput = await prepareKimiMediaInput({ blobUrl, frames })
  const parsedPreferences = parseUserAdPreferences(
    typeof userPreferences === 'string' ? userPreferences : JSON.stringify(userPreferences)
  )

  let kimiResult: GenerateAdResponse
  try {
    kimiResult = await analyzeVideoAndGenerateAd(mediaInput.mediaBase64, mediaInput.mediaType, frames, parsedPreferences)
  } catch (err) {
    throw new Error(`Kimi error: ${(err as Error).message}`)
  }

  let sessionId = ''
  let sessionIdB = ''
  let libtv: GenerateAdResponse['libtv'] = {
    attempted: false,
    status: 'not-configured',
    error: 'LIBTV_ACCESS_KEY is missing; returning Kimi-generated ad card without video rendering.',
  }

  const selectedAdvertiser = MOCK_ADVERTISERS.find(
    asset => asset.id === kimiResult.selectedAdvertiser?.id
  )
  const sceneContext = [
    kimiResult.videoSceneUnderstanding ? `VideoSceneUnderstanding: ${JSON.stringify(kimiResult.videoSceneUnderstanding)}` : '',
    kimiResult.sceneAnalysis.sceneType,
    kimiResult.sceneAnalysis.reasoning,
    `推荐广告形式：${kimiResult.adFormatReason}`,
  ].filter(Boolean).join('；')

  if (isLibtvConfigured()) {
    libtv = { attempted: true, status: 'queued' }
    try {
      const sessionA = await createLibtvSession(buildLibtvMessage({
        videoPrompt: kimiResult.videoPromptA,
        libtvPrompt: kimiResult.libtvPromptA,
        adFormat: kimiResult.adFormat,
        adCopy: kimiResult.adCopyA,
        advertiser: selectedAdvertiser,
        sceneContext,
        script: kimiResult.fifteenSecScript,
        adDirection: kimiResult.adDirection,
        promptQualityGate: kimiResult.promptQualityGate,
      }))
      sessionId = sessionA.sessionId
      libtv.projectUuidA = sessionA.projectUuid
      libtv.projectUrlA = sessionA.projectUrl

      const sessionB = await createLibtvSession(buildLibtvMessage({
        videoPrompt: kimiResult.videoPromptB,
        libtvPrompt: kimiResult.libtvPromptB,
        adFormat: kimiResult.adFormat,
        adCopy: kimiResult.adCopyB,
        advertiser: selectedAdvertiser,
        sceneContext,
        script: kimiResult.fifteenSecScript,
        adDirection: kimiResult.adDirection,
        promptQualityGate: kimiResult.promptQualityGate,
      }))
      sessionIdB = sessionB.sessionId
      libtv.projectUuidB = sessionB.projectUuid
      libtv.projectUrlB = sessionB.projectUrl
    } catch (err) {
      libtv = {
        attempted: true,
        status: 'error',
        error: (err as Error).message,
      }
      console.error('[generate-ad] Libtv error:', (err as Error).message)
    }
  }

  return {
    ...kimiResult,
    sessionId,
    sessionIdB,
    libtv,
  }
}
