import { buildLibtvMessage, createLibtvSession, isLibtvConfigured } from './libtv'
import { MOCK_ADVERTISERS } from './mock-advertisers'
import type { GenerateAdResponse } from '../types'
import type { LibtvAdJobResult, LibtvAdJobStage } from './libtv-ad-job-store'

export async function generateLibtvAdFromAnalysis(
  analysis: GenerateAdResponse,
  onStage: (stage: LibtvAdJobStage) => void = () => undefined
): Promise<LibtvAdJobResult> {
  if (!isLibtvConfigured()) {
    return {
      attempted: false,
      status: 'not-configured',
      error: 'LIBTV_ACCESS_KEY is missing; returning AI-generated ad card without video rendering.',
    }
  }

  onStage('building_libtv_message')
  const selectedAdvertiser = MOCK_ADVERTISERS.find(asset => asset.id === analysis.selectedAdvertiser?.id)
  const sceneContext = [
    analysis.videoSceneUnderstanding ? `VideoSceneUnderstanding: ${JSON.stringify(analysis.videoSceneUnderstanding)}` : '',
    analysis.sceneAnalysis.sceneType,
    analysis.sceneAnalysis.reasoning,
    `推荐广告形式：${analysis.adFormatReason}`,
  ].filter(Boolean).join('；')

  try {
    onStage('creating_libtv_session_a')
    const sessionA = await createLibtvSession(buildLibtvMessage({
      videoPrompt: analysis.videoPromptA,
      libtvPrompt: analysis.libtvPromptA,
      adFormat: analysis.adFormat,
      adCopy: analysis.adCopyA,
      advertiser: selectedAdvertiser,
      sceneContext,
      script: analysis.fifteenSecScript,
      adDirection: analysis.adDirection,
      promptQualityGate: analysis.promptQualityGate,
    }))

    onStage('creating_libtv_session_b')
    const sessionB = await createLibtvSession(buildLibtvMessage({
      videoPrompt: analysis.videoPromptB,
      libtvPrompt: analysis.libtvPromptB,
      adFormat: analysis.adFormat,
      adCopy: analysis.adCopyB,
      advertiser: selectedAdvertiser,
      sceneContext,
      script: analysis.fifteenSecScript,
      adDirection: analysis.adDirection,
      promptQualityGate: analysis.promptQualityGate,
    }))

    return {
      attempted: true,
      status: 'queued',
      sessionId: sessionA.sessionId,
      sessionIdB: sessionB.sessionId,
      projectUuidA: sessionA.projectUuid,
      projectUuidB: sessionB.projectUuid,
      projectUrlA: sessionA.projectUrl,
      projectUrlB: sessionB.projectUrl,
    }
  } catch (err) {
    console.error('[generate-libtv-ad] Libtv error:', (err as Error).message)
    return { attempted: true, status: 'error', error: (err as Error).message }
  }
}
