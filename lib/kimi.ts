import type { GenerateAdResponse, VideoFrameInput } from '@/types'
import { parseKimiJsonResponse } from './kimi-response'
import {
  buildFrameAnalysisPrompt,
  buildKimiContentBlocks,
  buildKimiPrompt,
  kimiMessagesUrl as buildKimiMessagesUrl,
} from './kimi-url'
import { MOCK_ADVERTISERS } from './mock-advertisers'
import type { UserAdPreferences } from './user-preferences'

const KIMI_BASE_URL = process.env.KIMI_BASE_URL
const KIMI_API_KEY = process.env.KIMI_API_KEY

export function kimiMessagesUrl(baseUrl = KIMI_BASE_URL): string {
  return buildKimiMessagesUrl(baseUrl)
}

const KIMI_SYSTEM_PROMPT = `你是 AdDrama 的广告导演 AI，擅长分析视频关键帧、选择合适广告素材、判断广告插入位置和广告模式，并生成场景化广告方案。请严格按照 JSON 格式输出，不要包含任何 Markdown 代码块或额外文字。`

export async function analyzeVideoAndGenerateAd(
  videoBase64: string,
  mediaType: string,
  frames: VideoFrameInput[] = [],
  userPreferences?: UserAdPreferences
): Promise<GenerateAdResponse> {
  if (!KIMI_API_KEY) {
    throw new Error('KIMI_API_KEY is required. Set it in Vercel Environment Variables and .env.local.')
  }

  const basePrompt = buildKimiPrompt({
    adLibrary: MOCK_ADVERTISERS,
    userPreferences,
  })
  const prompt = buildFrameAnalysisPrompt({
    basePrompt,
    frameTimes: frames.map(frame => frame.timestampSec),
  })
  const messageContent = buildKimiContentBlocks({
    mediaType,
    mediaBase64: videoBase64,
    prompt,
    frames,
  })

  const response = await fetch(kimiMessagesUrl(), {
    method: 'POST',
    headers: {
      'x-api-key': KIMI_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'kimi-k2',
      system: KIMI_SYSTEM_PROMPT,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Kimi API error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const content = data.content?.[0]?.text ?? data.choices?.[0]?.message?.content ?? ''
  if (!content) {
    throw new Error(`Kimi returned an empty response: ${JSON.stringify(data).slice(0, 500)}`)
  }

  const parsed = parseKimiJsonResponse(content)

  return {
    ...parsed,
    sessionId: '',
    sessionIdB: '',
  }
}
