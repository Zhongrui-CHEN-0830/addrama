import type { GenerateAdResponse, VideoFrameInput } from '@/types'
import { parseKimiJsonResponse, normalizeLightKimiResult } from './kimi-response'
import {
  buildFrameAnalysisPrompt,
  buildKimiContentBlocks,
  buildKimiPrompt,
  buildLightKimiPrompt,
  kimiMessagesUrl as buildKimiMessagesUrl,
} from './kimi-url'
import { MOCK_ADVERTISERS } from './mock-advertisers'
import type { UserAdPreferences } from './user-preferences'

const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL ?? process.env.PROXY_BASE_URL
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? process.env.PROXY_API_KEY
const KIMI_BASE_URL = process.env.KIMI_BASE_URL
const KIMI_API_KEY = process.env.KIMI_API_KEY
const AI_ANALYSIS_PROVIDER = process.env.AI_ANALYSIS_PROVIDER === 'kimi' ? 'kimi' : 'anthropic'
const KIMI_ANALYSIS_MODE = process.env.KIMI_ANALYSIS_MODE === 'director' ? 'director' : 'light'
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'

export function kimiMessagesUrl(baseUrl = KIMI_BASE_URL): string {
  return buildKimiMessagesUrl(baseUrl)
}

export function anthropicMessagesUrl(baseUrl = ANTHROPIC_BASE_URL): string {
  if (!baseUrl) {
    throw new Error('ANTHROPIC_BASE_URL is required. Set it in Vercel Environment Variables and .env.local.')
  }
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  if (base.endsWith('/v1/')) return `${base}messages`
  return `${base}v1/messages`
}

const AI_SYSTEM_PROMPT = `你是 AdDrama 的广告导演 AI，擅长分析视频关键帧、选择合适广告素材、判断广告插入位置和广告模式。请严格按照 JSON 格式输出，不要包含任何 Markdown 代码块或额外文字。`

function buildAnalysisPrompt(frames: VideoFrameInput[], userPreferences?: UserAdPreferences): string {
  const basePrompt = KIMI_ANALYSIS_MODE === 'director'
    ? buildKimiPrompt({ adLibrary: MOCK_ADVERTISERS, userPreferences })
    : buildLightKimiPrompt({ adLibrary: MOCK_ADVERTISERS, userPreferences })
  return buildFrameAnalysisPrompt({
    basePrompt,
    frameTimes: frames.map(frame => frame.timestampSec),
  })
}

function normalizeAiResponseContent(data: unknown): string {
  const value = data as { content?: Array<{ text?: unknown }>; choices?: Array<{ message?: { content?: unknown } }> }
  return value.content?.find(block => typeof block.text === 'string')?.text as string
    ?? (typeof value.choices?.[0]?.message?.content === 'string' ? value.choices[0].message.content : '')
}

async function analyzeWithAnthropicCompatible(
  videoBase64: string,
  mediaType: string,
  frames: VideoFrameInput[],
  userPreferences?: UserAdPreferences
): Promise<GenerateAdResponse> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required. Set it in Vercel Environment Variables and .env.local.')
  }

  const prompt = buildAnalysisPrompt(frames, userPreferences)
  const messageContent = buildKimiContentBlocks({ mediaType, mediaBase64: videoBase64, prompt, frames })
  const response = await fetch(anthropicMessagesUrl(), {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      system: AI_SYSTEM_PROMPT,
      max_tokens: KIMI_ANALYSIS_MODE === 'director' ? 4096 : 900,
      messages: [{ role: 'user', content: messageContent }],
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Anthropic-compatible API error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const content = normalizeAiResponseContent(data)
  if (!content) throw new Error(`Anthropic-compatible provider returned an empty response: ${JSON.stringify(data).slice(0, 500)}`)

  const parsed = parseKimiJsonResponse(content)
  const normalized = normalizeLightKimiResult(parsed, MOCK_ADVERTISERS)
  return { ...normalized, sessionId: '', sessionIdB: '' }
}

async function analyzeWithKimi(
  videoBase64: string,
  mediaType: string,
  frames: VideoFrameInput[],
  userPreferences?: UserAdPreferences
): Promise<GenerateAdResponse> {
  if (!KIMI_API_KEY) {
    throw new Error('KIMI_API_KEY is required. Set it in Vercel Environment Variables and .env.local.')
  }

  const prompt = buildAnalysisPrompt(frames, userPreferences)
  const messageContent = buildKimiContentBlocks({ mediaType, mediaBase64: videoBase64, prompt, frames })
  const response = await fetch(kimiMessagesUrl(), {
    method: 'POST',
    headers: {
      'x-api-key': KIMI_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'kimi-k2',
      system: AI_SYSTEM_PROMPT,
      max_tokens: KIMI_ANALYSIS_MODE === 'director' ? 4096 : 900,
      messages: [{ role: 'user', content: messageContent }],
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Kimi API error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const content = normalizeAiResponseContent(data)
  if (!content) throw new Error(`Kimi returned an empty response: ${JSON.stringify(data).slice(0, 500)}`)

  const parsed = parseKimiJsonResponse(content)
  const normalized = normalizeLightKimiResult(parsed, MOCK_ADVERTISERS)
  return { ...normalized, sessionId: '', sessionIdB: '' }
}

export async function analyzeVideoAndGenerateAd(
  videoBase64: string,
  mediaType: string,
  frames: VideoFrameInput[] = [],
  userPreferences?: UserAdPreferences
): Promise<GenerateAdResponse> {
  if (AI_ANALYSIS_PROVIDER === 'kimi') {
    return analyzeWithKimi(videoBase64, mediaType, frames, userPreferences)
  }
  return analyzeWithAnthropicCompatible(videoBase64, mediaType, frames, userPreferences)
}
