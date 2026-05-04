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

export function buildLightKimiPrompt({
  adLibrary,
  userPreferences,
}: {
  adLibrary: AdvertiserAsset[]
  userPreferences?: UserAdPreferences
}): string {
  const compactLibrary = adLibrary.map(asset => ({
    id: asset.id,
    brandName: asset.brandName,
    productName: asset.productName,
    industry: asset.industry,
    suitableScenes: asset.suitableScenes,
    suitableFormats: asset.suitableFormats,
    keySellingPoint: asset.keySellingPoint,
    brandTone: asset.brandTone,
  }))
  const preferenceJson = JSON.stringify(userPreferences ?? null, null, 2)

  return `你是 AdDrama 的轻量模式视频广告分析 AI。目标是用最少 token 完成：理解视频关键帧、选择一个广告素材、判断广告插入风险和广告形式。不要生成 Libtv 导演提示词、完整分镜、长文案或大 JSON。

紧凑广告库（只能从这些 id 中选择，不得编造品牌）：
${JSON.stringify(compactLibrary, null, 2)}

本次 demo 用户偏好：
${preferenceJson}

请只输出 JSON，不要 Markdown，不要解释推理过程。字段如下：
{
  "selectedAdvertiserId": "广告库中的 id",
  "sceneType": "场景类型，≤20字",
  "emotionScore": 0,
  "tags": ["标签1", "标签2", "标签3"],
  "advertisingRisk": "low|medium|high",
  "recommendedInsertPoints": [0],
  "adFormat": "short|buffer-card|character-match|interactive|drama-style|end-card",
  "adFormatReason": "为什么选择该形式，≤40字",
  "shortReason": "为什么这个广告素材适合当前剧情，≤60字"
}

规则：
- selectedAdvertiserId 必须来自紧凑广告库。
- recommendedInsertPoints 优先选择抽帧时间点附近的 green/yellow 位置。
- adFormat 必须结合画面内容、广告素材 suitableFormats 和用户偏好选择。
- 只做轻量判断；导演提示、镜头列表、旁白、字幕、负面约束 将由本地模板生成。`
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

  return `你是 AdDrama 的广告导演 AI。你不是普通广告文案生成器，而是“广告导演 + 媒介策略师 + 分镜师”。产品真实工作流是：平台后台预存多个广告主原始素材；你必须先理解当前剧集场景，再从广告库中选择最匹配的可生成素材，然后输出可直接交给 Libtv/Seedance 的完整导演说明书。

广告库（必须从中选择一个素材，不得凭空编造品牌；只有广告库为空时才可使用默认广告主）。这些字段是可生成素材库，不只是品牌信息库：assetVisualElements/usageScenarios/emotionalMapping/cameraSuggestions/audioSuggestions/forbiddenRepresentations/formatFit 都必须参与创作。
${libraryJson}

本次 demo 会话内的用户广告偏好（只用于本次推荐，不写数据库）：
${preferenceJson}

你必须按两层推理输出，但最终只输出 JSON，不要输出推理过程散文：
第一层：VideoSceneUnderstanding
- sceneType：古装梳妆/都市争吵/悬疑转场/公路夜景等
- emotionCurve：情绪曲线，按时间段描述情绪与强度
- rhythmTimeline：节奏分段与推荐插入点
- visualMotifs：画面母题，如镜子、雨、车灯、烛光、饭桌、手机
- characterState：人物状态，如犹豫、释然、紧张、放松
- adInsertionRisk：插入风险 high/medium/low
- bestInsertReason：为什么这里可以插广告

第二层：AdDirectionPackage
- 必须先从广告库中选择一个最匹配的广告素材，输出 selectedAdvertiser，并说明 matchReason。
- 先选择 selectedAdvertiser 和 adFormat
- 再基于 VideoSceneUnderstanding + 广告素材库生成 creativeBrief、sceneBridge、shotList、voiceover、subtitles、visualStyle、productIntegration、negativePrompt
- 不要从视频帧直接跳到 videoPrompt；中间必须有“场景理解层”和“导演分镜层”。

广告模式只能从以下六种选择：
- short：普通短广告。适合用户无明显反感、内容节奏平缓。
- buffer-card：剧情缓冲卡。目标不是广告片，而是剧情呼吸点。必须包含原剧情余韵、轻量产品出现、低信息密度、3-8 秒、少字幕、无强 CTA、环境声/音乐延续。典型结构：0-1.5s 承接原片空镜/情绪；1.5-4s 产品以环境物件出现；4-6s 一句轻字幕/轻旁白；6-8s 品牌克制露出，淡出回剧情。
- character-match：角色同款推荐。必须包含角色妆造/道具/生活方式观察，商品和角色气质映射；不能说“官方同款”，不能用演员姓名；可以说“同款灵感”“相似氛围”“剧感妆容/穿搭灵感”。典型结构：0-2s 角色细节/场景元素转译；2-6s 商品材质/颜色/使用动作；6-10s 现实生活场景迁移；10-12s 轻量推荐卡。
- interactive：互动选择广告。适合用户对广告敏感，但愿意换取更短广告/跳过权益；仍必须生成完整可播放视频。
- drama-style：AI短剧式广告。目标不是产品展示，而是迷你番外；必须有小冲突、商品自然介入、情绪解决；角色不能冒充原剧人物，场景不能声称原剧官方番外。典型结构：0-3s 生活化冲突；3-7s 商品作为解决方案出现；7-12s 冲突缓和/情绪反转；12-15s 品牌露出 + 一句收束。
- end-card：低打扰片尾广告。适合用户沉浸观看、连续追剧，放在片尾、下一集前、暂停页。

Libtv 最终 prompt / 视频生成 prompt 质量要求：
- 不要只把 videoPromptA/videoPromptB 当成一句广告创意描述；必须把它升级为完整导演说明书。
每个 libtvPromptA/libtvPromptB 必须包含：
- 中文导演要求：广告形式、剧情承接、分镜表、字幕、旁白、商品露出方式、禁止事项
- Libtv 最终 prompt 必须中英混合：中文导演要求优先，英文视觉生成提示增强画面稳定性。
- English visual generation prompt: cinematic visual prompt, camera movement, lighting, mood, product shot, transitions
- Negative prompt: no static poster, no giant text, no cheap e-commerce layout, no fake celebrity, no official drama collaboration claim, no medical/absolute/superlative claims
- 明确要求生成真实可播放视频 mp4/webm/mov，而不是静态图/海报/PPT。

Prompt Quality Gate：生成 libtvPromptA/B 后必须自检；如不合格，先在 JSON 内给出修订后的合格版本，不要把不合格版本输出为最终 prompt。检查项：
- 是否有明确分镜？
- 是否有镜头切换？
- 是否有剧情承接？
- 是否有商品出现方式？
- 是否有旁白？
- 是否有字幕？
- 是否有声音/音乐建议？
- 是否包含广告主素材库中的真实品牌/商品/卖点？
- 是否避免 bannedWords 与 forbiddenRepresentations？
- 是否避免静态海报描述？
- 是否明确要求生成 mp4/webm/mov？
- 是否区分了 buffer-card / character-match / drama-style？

请输出以下 JSON 结构（不要包含 Markdown 代码块）：
{
  "selectedAdvertiser": {
    "id": "（广告库中的 id）",
    "industry": "（行业）",
    "brandName": "（品牌名）",
    "productName": "（商品名）",
    "matchReason": "（为什么当前剧情适合该广告素材，≤80字）"
  },
  "videoSceneUnderstanding": {
    "sceneType": "（场景类型，如：古装剧·梳妆场景）",
    "emotionCurve": [
      { "timeRange": "0-2s", "emotion": "（情绪）", "intensity": 42 }
    ],
    "rhythmTimeline": {
      "segments": [
        { "startSec": 0, "endSec": 8, "risk": "green", "reason": "转场空镜/对白密集等", "emotionScore": 30 }
      ],
      "recommendedInsertPoints": [8]
    },
    "visualMotifs": ["镜子", "烛光", "雨"],
    "characterState": "（人物状态）",
    "adInsertionRisk": "low",
    "bestInsertReason": "（为什么这里能插广告）"
  },
  "adFormat": "（从以下选一: short/buffer-card/character-match/interactive/drama-style/end-card）",
  "adFormatReason": "（选择该广告形式的理由，≤50字）",
  "adDirection": {
    "creativeBrief": "（广告创意总述，说明为什么适合当前剧情）",
    "sceneBridge": "（从原视频剧情如何自然过渡到广告：原剧情情绪、插入点、广告第一镜如何承接、如何避免跳出感）",
    "shotList": [
      {
        "shot": 1,
        "timeRange": "0-2s",
        "visual": "（承接原剧情的具体画面）",
        "camera": "slow push-in, shallow depth of field",
        "transition": "match cut from original warm light",
        "productRole": "（商品如何作为道具/背景卡片/生活方式延伸/剧情解决方案出现，露出时长）",
        "subtitle": "（字幕，不得大字报，不含 bannedWords）",
        "voiceover": "（旁白句）",
        "sound": "soft guzheng, light fabric movement"
      }
    ],
    "voiceover": { "content": "（完整旁白）", "tone": "克制/温柔/坚定等", "voice": "女声/男声/无旁白", "speed": "慢/中/快", "emotion": "情绪" },
    "voiceoverScript": "（单独旁白脚本，不混在 prompt 里）",
    "subtitles": [ { "timeRange": "0-2s", "text": "（字幕）", "maxChars": 12 } ],
    "subtitleScript": [ { "timeRange": "0-2s", "text": "（字幕）", "maxChars": 12 } ],
    "audioDirection": "（环境声/音乐/品牌声音资产）",
    "visualStyle": "（镜头语言、光线、色彩、构图、景别、节奏；参考氛围但不要侵权或复刻原剧）",
    "productIntegration": "（商品作为道具/背景卡片/生活方式延伸/剧情解决方案；露出时长；不能硬切电商页）",
    "negativePrompt": "不要静态海报，不要 PPT 感，不要巨大促销字，不要真人演员姓名，不要冒充原剧官方联名，不要违规功效承诺，不要夸张口播，不要价格/优惠券轰炸"
  },
  "adCopyA": "（A版文案，≤40字，场景相关，中文）",
  "adCopyB": "（B版文案，≤40字，不同风格，中文）",
  "videoPromptA": "（兼容旧字段：A版英文视觉提示摘要，≤100词）",
  "videoPromptB": "（兼容旧字段：B版英文视觉提示摘要，≤100词）",
  "libtvPromptA": "（A版完整 Libtv 导演提示词：中文导演要求 + English visual generation prompt + negative prompt + mp4/webm/mov 要求）",
  "libtvPromptB": "（B版完整 Libtv 导演提示词：与 A 版不同角度，但同样完整）",
  "interactiveQuestion": "（互动问题，≤20字，引导用户参与）",
  "fifteenSecScript": "（兼容旧字段：15秒广告脚本，含画面描述和台词）",
  "promptQualityGate": {
    "passed": true,
    "checkedItems": ["明确分镜", "镜头切换", "剧情承接", "商品出现方式", "旁白", "字幕", "声音/音乐建议", "真实品牌商品卖点", "避免禁词", "避免静态海报", "mp4/webm/mov", "区分广告形式"],
    "missingItems": [],
    "revisionNote": "若初稿缺项，说明已如何自我修订"
  },
  "sceneAnalysis": {
    "sceneType": "（兼容旧字段，同 videoSceneUnderstanding.sceneType）",
    "emotionScore": 42,
    "tags": ["标签1", "标签2", "标签3"],
    "advertisingRisk": "low",
    "recommendedAdType": "（推荐广告类型描述）",
    "reasoning": "（推理说明，≤80字）"
  },
  "rhythmTimeline": {
    "segments": [
      { "startSec": 0, "endSec": 8, "risk": "green", "reason": "转场空镜/对白密集等", "emotionScore": 30 }
    ],
    "recommendedInsertPoints": [8]
  }
}

判断广告插入风险的标准：
- red（禁止）：剧情高潮、情绪爆发、人物对白密集、关键悬念点
- yellow（谨慎）：情绪转换中、节奏变化期
- green（推荐）：转场空镜、回忆片段、环境镜头、片头片尾、章节间隔`}

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
