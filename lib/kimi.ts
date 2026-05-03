import type { GenerateAdResponse, AdvertiserInput, VideoFrameInput } from '@/types'
import {
  buildFrameAnalysisPrompt,
  buildKimiContentBlocks,
  kimiMessagesUrl as buildKimiMessagesUrl,
} from './kimi-url'

const KIMI_BASE_URL = process.env.KIMI_BASE_URL
const KIMI_API_KEY = process.env.KIMI_API_KEY

export function kimiMessagesUrl(baseUrl = KIMI_BASE_URL): string {
  return buildKimiMessagesUrl(baseUrl)
}

const KIMI_SYSTEM_PROMPT = `你是一个专业的广告策划 AI，擅长分析视频内容并生成场景化广告方案。请严格按照 JSON 格式输出，不要包含任何 Markdown 代码块或额外文字。`

function buildKimiPrompt(advertiser: AdvertiserInput): string {
  return `请分析这段视频，并根据以下广告主信息生成广告方案。

广告主信息：
- 品牌名：${advertiser.brandName}
- 商品名：${advertiser.productName}
- 核心卖点：${advertiser.keySellingPoint}
- 禁用词：${advertiser.bannedWords}
- 目标人群：${advertiser.targetAudience}
- 品牌调性：${advertiser.brandTone}

请输出以下 JSON 结构（不要包含 Markdown 代码块）。如果当前请求没有包含可直接读取的视频帧，请基于广告主信息和“用户上传的视频片段”这一上下文，生成一个可用于演示的场景化广告方案，并在 sceneAnalysis.reasoning 中说明这是基于上传视频上下文的广告决策模拟：
{
  "adCopyA": "（A版文案，≤40字，场景相关，中文）",
  "adCopyB": "（B版文案，≤40字，不同风格，中文）",
  "videoPromptA": "（A版 Seedance 视频描述，≤100词，英文，描述画面）",
  "videoPromptB": "（B版 Seedance 视频描述，≤100词，英文，不同风格）",
  "interactiveQuestion": "（互动问题，≤20字，引导用户参与）",
  "fifteenSecScript": "（15秒广告脚本，含画面描述和台词）",
  "adFormat": "（从以下选一: short/buffer-card/character-match/interactive/drama-style/end-card）",
  "adFormatReason": "（选择该广告形式的理由，≤50字）",
  "sceneAnalysis": {
    "sceneType": "（场景类型，如：修真动漫·战斗场景）",
    "emotionScore": （0-100整数，当前情绪强度）,
    "tags": ["标签1", "标签2", "标签3"],
    "advertisingRisk": "（high/medium/low）",
    "recommendedAdType": "（推荐广告类型描述）",
    "reasoning": "（推理说明，≤80字）"
  },
  "rhythmTimeline": {
    "segments": [
      {
        "startSec": 0,
        "endSec": （秒数整数）,
        "risk": "（red/yellow/green）",
        "reason": "（原因，如：打斗高潮/转场空镜/对白密集）",
        "emotionScore": （0-100）
      }
    ],
    "recommendedInsertPoints": [（推荐广告插入的秒数，整数数组）]
  }
}

判断广告插入风险的标准：
- red（禁止）：剧情高潮、情绪爆发、人物对白密集、关键悬念点
- yellow（谨慎）：情绪转换中、节奏变化期
- green（推荐）：转场空镜、回忆片段、环境镜头、片头片尾、章节间隔`
}

export async function analyzeVideoAndGenerateAd(
  videoBase64: string,
  mediaType: string,
  advertiser: AdvertiserInput,
  frames: VideoFrameInput[] = []
): Promise<GenerateAdResponse> {
  if (!KIMI_API_KEY) {
    throw new Error('KIMI_API_KEY is required. Set it in Vercel Environment Variables and .env.local.')
  }

  const basePrompt = buildKimiPrompt(advertiser)
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
      max_tokens: 2048,
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

  let parsed: Omit<GenerateAdResponse, 'sessionId' | 'sessionIdB'>
  try {
    parsed = JSON.parse(content)
  } catch {
    // 若 JSON 解析失败，尝试提取 JSON 块
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) throw new Error(`Failed to parse Kimi response: ${content.slice(0, 200)}`)
    parsed = JSON.parse(match[0])
  }

  return {
    ...parsed,
    sessionId: '',
    sessionIdB: '',
  }
}
