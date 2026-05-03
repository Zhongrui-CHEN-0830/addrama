import type { GenerateAdResponse } from '@/types'

export type CachedAdResultState =
  | { status: 'pending' }
  | { status: 'ready'; result: GenerateAdResponse }
  | { status: 'error'; error: string }

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

export function parseCachedAdResult(raw: string | null): CachedAdResultState {
  if (!raw) return { status: 'pending' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { status: 'error', error: 'AI 分析失败：缓存结果不是有效 JSON，请返回上一页重新生成。' }
  }

  if (isGenerateAdResponse(parsed)) {
    return { status: 'ready', result: parsed }
  }

  return { status: 'error', error: getErrorMessage(parsed) }
}

export async function readGenerateAdResponse(response: Response): Promise<GenerateAdResponse> {
  const contentType = response.headers.get('content-type') ?? ''
  const rawText = await response.text()

  if (!contentType.toLowerCase().includes('application/json')) {
    const snippet = rawText.trim().slice(0, 200)
    const suffix = snippet ? `：${snippet}` : ''
    throw new Error(`AI 分析失败：服务端返回了非 JSON 错误响应（HTTP ${response.status}）${suffix}`)
  }

  let data: unknown
  try {
    data = JSON.parse(rawText)
  } catch {
    throw new Error(`AI 分析失败：服务端返回了无法解析的 JSON（HTTP ${response.status}）`)
  }

  if (!response.ok || !isGenerateAdResponse(data)) {
    throw new Error(getErrorMessage(data))
  }

  return data
}
