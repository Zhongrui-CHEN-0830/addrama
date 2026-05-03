import type { GenerateAdResponse } from '@/types'

export type GenerateAdJobCreateResponse = { jobId: string; status: 'pending' }

export type GenerateAdJobStatusResponse =
  | { jobId: string; status: 'pending' }
  | { jobId: string; status: 'done'; result: GenerateAdResponse }
  | { jobId: string; status: 'error'; error: string }

export type CachedGenerateAdJobState =
  | { status: 'ready'; jobId: string }
  | { status: 'missing' }
  | { status: 'error'; error: string }

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

export function isGenerateAdJobCreateResponse(value: unknown): value is GenerateAdJobCreateResponse {
  if (!value || typeof value !== 'object') return false
  const obj = value as Partial<GenerateAdJobCreateResponse>
  return typeof obj.jobId === 'string' && obj.jobId.length > 0 && obj.status === 'pending'
}

export function isGenerateAdJobStatusResponse(value: unknown): value is GenerateAdJobStatusResponse {
  if (!value || typeof value !== 'object') return false
  const obj = value as Partial<GenerateAdJobStatusResponse>
  if (typeof obj.jobId !== 'string' || obj.jobId.length === 0) return false
  if (obj.status === 'pending') return true
  if (obj.status === 'done') return isGenerateAdResponse((obj as { result?: unknown }).result)
  if (obj.status === 'error') return typeof (obj as { error?: unknown }).error === 'string'
  return false
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

export function startGenerateAdJobPolling(raw: string | null): CachedGenerateAdJobState {
  if (!raw) return { status: 'missing' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { status: 'error', error: 'AI 分析启动失败：缓存 job 不是有效 JSON，请返回上一页重新生成。' }
  }

  if (isGenerateAdJobCreateResponse(parsed)) {
    return { status: 'ready', jobId: parsed.jobId }
  }

  return { status: 'error', error: getErrorMessage(parsed).replace('AI 分析失败', 'AI 分析启动失败') }
}

function parseJsonResponse(rawText: string, status: number): unknown {
  try {
    return JSON.parse(rawText)
  } catch {
    throw new Error(`AI 分析失败：服务端返回了无法解析的 JSON（HTTP ${status}）`)
  }
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  const rawText = await response.text()

  if (!contentType.toLowerCase().includes('application/json')) {
    const snippet = rawText.trim().slice(0, 200)
    const suffix = snippet ? `：${snippet}` : ''
    throw new Error(`AI 分析失败：服务端返回了非 JSON 错误响应（HTTP ${response.status}）${suffix}`)
  }

  return parseJsonResponse(rawText, response.status)
}

export async function readGenerateAdResponse(response: Response): Promise<GenerateAdResponse> {
  const data = await readJsonResponse(response)

  if (!response.ok || !isGenerateAdResponse(data)) {
    throw new Error(getErrorMessage(data))
  }

  return data
}

export async function readGenerateAdJobCreateResponse(response: Response): Promise<GenerateAdJobCreateResponse> {
  const data = await readJsonResponse(response)

  if (!response.ok || !isGenerateAdJobCreateResponse(data)) {
    throw new Error(getErrorMessage(data).replace('AI 分析失败', 'AI 分析启动失败'))
  }

  return data
}

export async function readGenerateAdJobStatusResponse(response: Response): Promise<GenerateAdJobStatusResponse> {
  const data = await readJsonResponse(response)

  if (!response.ok || !isGenerateAdJobStatusResponse(data)) {
    throw new Error(getErrorMessage(data))
  }

  return data
}
