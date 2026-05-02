import type { GenerateAdResponse } from '@/types'

export function isGenerateAdResponse(value: unknown): value is GenerateAdResponse {
  if (!value || typeof value !== 'object') return false
  const obj = value as Partial<GenerateAdResponse>
  return (
    typeof obj.sessionId === 'string' &&
    typeof obj.adCopyA === 'string' &&
    typeof obj.adCopyB === 'string' &&
    typeof obj.videoPromptA === 'string' &&
    typeof obj.videoPromptB === 'string' &&
    typeof obj.interactiveQuestion === 'string' &&
    typeof obj.fifteenSecScript === 'string' &&
    typeof obj.adFormat === 'string' &&
    typeof obj.adFormatReason === 'string' &&
    !!obj.sceneAnalysis &&
    typeof obj.sceneAnalysis === 'object' &&
    Array.isArray(obj.sceneAnalysis.tags) &&
    !!obj.rhythmTimeline &&
    typeof obj.rhythmTimeline === 'object' &&
    Array.isArray(obj.rhythmTimeline.segments) &&
    Array.isArray(obj.rhythmTimeline.recommendedInsertPoints)
  )
}

export function getErrorMessage(value: unknown): string {
  if (value && typeof value === 'object' && 'error' in value) {
    const error = (value as { error?: unknown }).error
    if (typeof error === 'string') return error
  }
  return 'AI 分析失败：服务端没有返回有效广告分析结果'
}
