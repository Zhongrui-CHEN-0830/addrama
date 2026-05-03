import type { AdvertiserAsset } from '@/types'
import type { UserAdPreferences } from './user-preferences'

const KIMI_BASE_URL_REQUIRED_MESSAGE =
  'KIMI_BASE_URL is required. Set it in Vercel Environment Variables and .env.local.'

export interface ExtractedVideoFrame {
  timestampSec: number
  imageBase64: string
  mediaType: string
}

type KimiContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

export function kimiMessagesUrl(baseUrl: string | undefined): string {
  if (!baseUrl) {
    throw new Error(KIMI_BASE_URL_REQUIRED_MESSAGE)
  }

  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  // Kimi Coding 的 Anthropic-compatible base URL 是 https://api.kimi.com/coding/，
  // 但 Messages endpoint 仍然在 /v1/messages；Anthropic SDK 会自动拼 /v1/messages，
  // 这里直接 fetch 时需要显式拼出来。
  if (base.endsWith('/v1/')) return `${base}messages`
  return `${base}v1/messages`
}

export function buildKimiPrompt({
  adLibrary,
  userPreferences,
}: {
  adLibrary: AdvertiserAsset[]
  userPreferences?: UserAdPreferences
}): string {
  const libraryJson = JSON.stringify(adLibrary, null, 2)
  const preferenceJson = JSON.stringify(userPreferences ?? null, null, 2)

  return `你是 AdDrama 的广告导演 AI。产品真实工作流是：平台后台预存多个广告主原始素材；你先理解当前剧集场景，再从广告库中选择最匹配的素材，然后把该素材改写成与当前剧情相关的剧情化/定制式广告。

广告库（必须从中选择一个素材，不得凭空编造品牌；只有广告库为空时才可使用默认广告主）：
${libraryJson}

本次 demo 会话内的用户广告偏好（只用于本次推荐，不写数据库）：
${preferenceJson}

你必须完成三步推理：
1. 判断剧情：场景类型、情绪强度、广告插入风险、推荐插入点。
2. 必须先从广告库中选择一个最匹配的广告素材，输出 selectedAdvertiser，并说明 matchReason。
3. 再选择广告模式，并把广告素材改写成与当前剧情相关的广告文案、互动问题、15秒脚本和视频生成 prompt。

广告模式只能从以下六种选择：
- short：普通短广告。适合用户无明显反感、内容节奏平缓。
- buffer-card：剧情缓冲卡。适合剧集转场、章节间隔，3-8 秒轻量卡片。
- character-match：角色同款推荐。适合服装、美妆、食品、旅行、家居等可消费场景。
- interactive：互动选择广告。适合用户对广告敏感，但愿意换取更短广告/跳过权益。
- drama-style：AI 短剧式广告。适合品牌预算较高、适合剧情化表达。
- end-card：低打扰片尾广告。适合用户沉浸观看、连续追剧，放在片尾、下一集前、暂停页。

请输出以下 JSON 结构（不要包含 Markdown 代码块）：
{
  "selectedAdvertiser": {
    "id": "（广告库中的 id）",
    "industry": "（行业）",
    "brandName": "（品牌名）",
    "productName": "（商品名）",
    "matchReason": "（为什么当前剧情适合该广告素材，≤80字）"
  },
  "adCopyA": "（A版文案，≤40字，场景相关，中文）",
  "adCopyB": "（B版文案，≤40字，不同风格，中文）",
  "videoPromptA": "（A版 Libtv/Seedance 视频描述，≤100词，英文，描述画面）",
  "videoPromptB": "（B版 Libtv/Seedance 视频描述，≤100词，英文，不同风格）",
  "interactiveQuestion": "（互动问题，≤20字，引导用户参与）",
  "fifteenSecScript": "（15秒广告脚本，含画面描述和台词）",
  "adFormat": "（从以下选一: short/buffer-card/character-match/interactive/drama-style/end-card）",
  "adFormatReason": "（选择该广告形式的理由，≤50字）",
  "sceneAnalysis": {
    "sceneType": "（场景类型，如：古装剧·梳妆场景）",
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

export function buildFrameAnalysisPrompt({
  basePrompt,
  frameTimes,
}: {
  basePrompt: string
  frameTimes: number[]
}) {
  if (frameTimes.length === 0) return basePrompt

  const times = frameTimes.map(time => `${time.toFixed(1)}s`).join(', ')
  return `${basePrompt}

视频抽帧分析要求：
- 抽帧时间点：${times}
- 请把每张图视为该时间点的视频画面，综合判断剧情节奏、情绪强度、广告插入风险和广告类型。
- rhythmTimeline.segments 的 startSec/endSec 应覆盖这些抽帧时间点附近的剧情段落。
- rhythmTimeline.recommendedInsertPoints 必须优先从上述抽帧时间点附近选择，选择 green 或 yellow 且不打断剧情理解的位置。
- adFormat 必须根据画面内容、广告库素材、用户偏好和节奏选择，而不是固定选择默认形式。`
}

export function buildKimiContentBlocks({
  mediaType,
  mediaBase64,
  prompt,
  frames = [],
}: {
  mediaType: string
  mediaBase64: string
  prompt: string
  frames?: ExtractedVideoFrame[]
}): KimiContentBlock[] {
  if (frames.length > 0) {
    return [
      {
        type: 'text',
        text: '下面是从用户上传视频中按时间顺序抽取的关键帧。请结合每张图前的时间戳判断剧情节奏、广告插入风险和广告类型。',
      },
      ...frames.flatMap((frame): KimiContentBlock[] => [
        { type: 'text', text: `视频帧 t=${frame.timestampSec.toFixed(1)}s` },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: frame.mediaType,
            data: frame.imageBase64,
          },
        },
      ]),
      { type: 'text', text: prompt },
    ]
  }

  if (mediaType.startsWith('image/')) {
    return [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: mediaBase64,
        },
      },
      { type: 'text', text: prompt },
    ]
  }

  return [{ type: 'text', text: prompt }]
}
