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
- adFormat 必须根据画面内容和节奏选择，而不是固定选择默认形式。`
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
