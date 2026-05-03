import type { AdFormat, AdStatusResponse } from '@/types'

const LIBTV_BASE = process.env.OPENAPI_IM_BASE ?? process.env.IM_BASE_URL ?? 'https://im.liblib.tv'
const PROJECT_CANVAS_BASE = 'https://www.liblib.tv/canvas?projectId='
const GENERATED_MEDIA_URL_PATTERN = /https:\/\/libtv-res\.liblib\.art\/[^\s"'<>]+\.(?:mp4|mov|webm|png|jpg|jpeg|webp)/gi

export interface LibtvSession {
  projectUuid: string
  sessionId: string
  projectUrl: string
}

export interface LibtvGenerationStatus {
  attempted: boolean
  status: 'not-configured' | 'queued' | 'error'
  error?: string
  projectUrlA?: string
  projectUrlB?: string
}

export function isLibtvConfigured(accessKey = process.env.LIBTV_ACCESS_KEY): boolean {
  return Boolean(accessKey?.trim())
}

export function buildProjectUrl(projectUuid: string): string {
  const trimmed = projectUuid.trim()
  return trimmed ? `${PROJECT_CANVAS_BASE}${trimmed}` : ''
}

function getAccessKey(): string {
  const accessKey = process.env.LIBTV_ACCESS_KEY?.trim()
  if (!accessKey) {
    throw new Error('LIBTV_ACCESS_KEY is required for Libtv generation')
  }
  return accessKey
}

function libtvHeaders(accessKey = getAccessKey()) {
  return {
    Authorization: `Bearer ${accessKey}`,
    'Content-Type': 'application/json',
  }
}

function normalizeErrorText(text: string) {
  return text.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]').slice(0, 500)
}

export function extractGeneratedMediaUrls(messages: Array<{ role?: string; content?: unknown }>): string[] {
  const urls: string[] = []

  for (const message of messages) {
    const content = message.content
    if (typeof content !== 'string' || !content) continue

    if (message.role === 'tool') {
      try {
        const data = JSON.parse(content) as {
          task_result?: {
            videos?: Array<{ previewPath?: string; url?: string; path?: string; downloadUrl?: string }>
            images?: Array<{ previewPath?: string; url?: string; path?: string; downloadUrl?: string }>
          }
        }
        for (const video of data.task_result?.videos ?? []) {
          const url = video.previewPath ?? video.url ?? video.path ?? video.downloadUrl
          if (url) urls.push(url)
        }
        for (const image of data.task_result?.images ?? []) {
          const url = image.previewPath ?? image.url ?? image.path ?? image.downloadUrl
          if (url) urls.push(url)
        }
      } catch {
        // Ignore non-JSON tool messages.
      }
    }

    if (message.role === 'assistant') {
      urls.push(...content.match(GENERATED_MEDIA_URL_PATTERN) ?? [])
    }
  }

  return [...new Set(urls)]
}

export function selectBestGeneratedMediaUrl(urls: string[]): string {
  return urls.find(url => /\.(mp4|webm|mov)(?:$|\?)/i.test(url)) ?? urls[0] ?? ''
}

export function buildLibtvMessage({
  videoPrompt,
  adFormat,
  adCopy,
}: {
  videoPrompt: string
  adFormat?: AdFormat
  adCopy?: string
}) {
  return [
    '请根据以下广告创意生成一个适合 16:9 播放的短视频广告。',
    adFormat ? `广告形式：${adFormat}` : '',
    adCopy ? `核心文案：${adCopy}` : '',
    `视频创意：${videoPrompt}`,
  ].filter(Boolean).join('\n')
}

export async function createLibtvSession(message: string): Promise<LibtvSession> {
  const res = await fetch(`${LIBTV_BASE.replace(/\/$/, '')}/openapi/session`, {
    method: 'POST',
    headers: libtvHeaders(),
    body: JSON.stringify({ message }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Libtv createSession error ${res.status}: ${normalizeErrorText(err)}`)
  }

  const json = await res.json()
  const data = json.data ?? {}
  const projectUuid = data.projectUuid ?? ''
  const sessionId = data.sessionId ?? ''

  if (!sessionId) {
    throw new Error(`Libtv createSession returned no sessionId: ${JSON.stringify(json).slice(0, 500)}`)
  }

  return {
    projectUuid,
    sessionId,
    projectUrl: buildProjectUrl(projectUuid),
  }
}

export async function queryLibtvSession(
  sessionId: string,
  afterSeq = 0,
  projectUuid = ''
): Promise<AdStatusResponse> {
  const path = afterSeq > 0
    ? `/openapi/session/${sessionId}?afterSeq=${afterSeq}`
    : `/openapi/session/${sessionId}`
  const url = `${LIBTV_BASE.replace(/\/$/, '')}${path}`

  const res = await fetch(url, {
    method: 'GET',
    headers: libtvHeaders(),
  })

  if (!res.ok) {
    const err = await res.text()
    return { status: 'error', error: normalizeErrorText(err) }
  }

  const json = await res.json()
  const messages: Array<{ role?: string; content?: unknown }> = json.data?.messages ?? []
  const urls = extractGeneratedMediaUrls(messages)
  const projectUrl = buildProjectUrl(projectUuid)

  if (urls.length > 0) {
    return {
      status: 'done',
      videoUrl: selectBestGeneratedMediaUrl(urls),
      projectUrl,
    }
  }

  return { status: 'pending', projectUrl }
}
