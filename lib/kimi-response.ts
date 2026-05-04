import type {
  AdDirectionPackage,
  AdFormat,
  AdvertiserAsset,
  GenerateAdResponse,
  PromptQualityGate,
  RhythmTimeline,
  SceneAnalysis,
  SelectedAdvertiser,
  VideoSceneUnderstanding,
} from '@/types'

export type KimiParsedAdResponse = Omit<GenerateAdResponse, 'sessionId' | 'sessionIdB'> & Partial<LightKimiAdResponse>

export interface LightKimiAdResponse {
  selectedAdvertiserId?: string
  sceneType?: string
  emotionScore?: number
  tags?: string[]
  advertisingRisk?: 'high' | 'medium' | 'low'
  recommendedInsertPoints?: number[]
  adFormat?: AdFormat
  adFormatReason?: string
  shortReason?: string
}

const AD_FORMAT_LABELS: Record<AdFormat, string> = {
  short: '普通短广告',
  'buffer-card': '剧情缓冲卡',
  'character-match': '角色同款推荐',
  interactive: '互动选择广告',
  'drama-style': 'AI短剧式广告',
  'end-card': '片尾低打扰广告',
}

export function parseKimiJsonResponse(content: string): KimiParsedAdResponse {
  const jsonText = extractJsonObject(content)

  try {
    return JSON.parse(jsonText) as KimiParsedAdResponse
  } catch (firstError) {
    const repaired = repairCommonKimiJson(jsonText)
    try {
      return JSON.parse(repaired) as KimiParsedAdResponse
    } catch (secondError) {
      const originalMessage = firstError instanceof Error ? firstError.message : String(firstError)
      const repairedMessage = secondError instanceof Error ? secondError.message : String(secondError)
      throw new Error(
        `Failed to parse Kimi response as JSON. original=${originalMessage}; repaired=${repairedMessage}; content=${content.slice(0, 500)}`
      )
    }
  }
}

export function isLightKimiResult(value: Partial<KimiParsedAdResponse>): value is LightKimiAdResponse {
  return 'selectedAdvertiserId' in value || !('adCopyA' in value)
}

export function normalizeLightKimiResult(
  light: Partial<KimiParsedAdResponse> | LightKimiAdResponse,
  adLibrary: AdvertiserAsset[]
): Omit<GenerateAdResponse, 'sessionId' | 'sessionIdB'> {
  if (!isLightKimiResult(light)) return light

  const advertiser = adLibrary.find(asset => asset.id === light.selectedAdvertiserId) ?? adLibrary[0]
  const adFormat = normalizeAdFormat(light.adFormat, advertiser)
  const sceneType = light.sceneType?.trim() || '剧情转场场景'
  const emotionScore = clampNumber(light.emotionScore, 0, 100, 35)
  const risk = normalizeRisk(light.advertisingRisk)
  const tags = normalizeTags(light.tags, sceneType, advertiser)
  const insertPoints = normalizeInsertPoints(light.recommendedInsertPoints)
  const shortReason = light.shortReason?.trim() || `${sceneType}与${advertiser.brandName}${advertiser.productName}的使用氛围匹配。`
  const adFormatReason = light.adFormatReason?.trim() || `${sceneType}适合${AD_FORMAT_LABELS[adFormat]}。`

  const selectedAdvertiser: SelectedAdvertiser = {
    id: advertiser.id,
    industry: advertiser.industry,
    brandName: advertiser.brandName,
    productName: advertiser.productName,
    matchReason: shortReason.slice(0, 80),
  }
  const sceneAnalysis: SceneAnalysis = {
    sceneType,
    emotionScore,
    tags,
    advertisingRisk: risk,
    recommendedAdType: AD_FORMAT_LABELS[adFormat],
    reasoning: shortReason.slice(0, 80),
  }
  const rhythmTimeline: RhythmTimeline = {
    segments: insertPoints.map((point, index) => ({
      startSec: Math.max(0, Number((point - 2).toFixed(1))),
      endSec: Number((point + 2).toFixed(1)),
      risk: risk === 'high' ? 'yellow' : 'green',
      reason: index === 0 ? shortReason : `${sceneType}附近的低打扰插入点`,
      emotionScore,
    })),
    recommendedInsertPoints: insertPoints,
  }
  const videoSceneUnderstanding: VideoSceneUnderstanding = {
    sceneType,
    emotionCurve: [{ timeRange: '0-关键帧末尾', emotion: risk === 'high' ? '紧张' : '平缓', intensity: emotionScore }],
    rhythmTimeline,
    visualMotifs: tags,
    characterState: `${sceneType}中的人物情绪${risk === 'high' ? '较强' : '相对稳定'}`,
    adInsertionRisk: risk,
    bestInsertReason: shortReason,
  }
  const adDirection = buildLocalAdDirection({ advertiser, adFormat, sceneType, shortReason })
  const promptQualityGate: PromptQualityGate = {
    passed: true,
    checkedItems: ['本地模板生成', '明确分镜', '镜头切换', '剧情承接', '商品出现方式', '旁白', '字幕', '声音/音乐建议', '真实品牌商品卖点', '避免禁词', '避免静态海报', 'mp4/webm/mov', '区分广告形式'],
    missingItems: [],
    revisionNote: 'Kimi 轻量模式只负责场景理解与广告选择；完整导演提示词由本地素材模板补全。',
  }

  return {
    selectedAdvertiser,
    videoSceneUnderstanding,
    adDirection,
    promptQualityGate,
    adCopyA: buildAdCopy(advertiser, adFormat, 'A'),
    adCopyB: buildAdCopy(advertiser, adFormat, 'B'),
    videoPromptA: buildVideoPrompt(advertiser, adFormat, sceneType, 'A'),
    videoPromptB: buildVideoPrompt(advertiser, adFormat, sceneType, 'B'),
    libtvPromptA: buildLocalLibtvPrompt({ advertiser, adFormat, sceneType, shortReason, variant: 'A', adDirection }),
    libtvPromptB: buildLocalLibtvPrompt({ advertiser, adFormat, sceneType, shortReason, variant: 'B', adDirection }),
    interactiveQuestion: adFormat === 'interactive' ? '想怎么继续？' : '想看同款灵感吗？',
    fifteenSecScript: buildFifteenSecScript(advertiser, adFormat, sceneType),
    adFormat,
    adFormatReason,
    sceneAnalysis,
    rhythmTimeline,
  }
}

function extractJsonObject(content: string): string {
  const start = content.indexOf('{')
  const end = content.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Failed to parse Kimi response: ${content.slice(0, 200)}`)
  }

  return content.slice(start, end + 1)
}

function repairCommonKimiJson(jsonText: string): string {
  return jsonText
    .replace(/```(?:json)?/gi, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([\[{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
}

function normalizeAdFormat(format: unknown, advertiser: AdvertiserAsset): AdFormat {
  const allowed: AdFormat[] = ['short', 'buffer-card', 'character-match', 'interactive', 'drama-style', 'end-card']
  if (typeof format === 'string' && allowed.includes(format as AdFormat)) return format as AdFormat
  return advertiser.suitableFormats[0] ?? 'short'
}

function normalizeRisk(risk: unknown): 'high' | 'medium' | 'low' {
  return risk === 'high' || risk === 'medium' || risk === 'low' ? risk : 'low'
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

function normalizeTags(tags: unknown, sceneType: string, advertiser: AdvertiserAsset): string[] {
  const parsed = Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string' && Boolean(tag.trim())) : []
  return Array.from(new Set([...parsed, sceneType, advertiser.industry.split('/')[0].trim()])).slice(0, 5)
}

function normalizeInsertPoints(points: unknown): number[] {
  const parsed = Array.isArray(points)
    ? points.filter((point): point is number => typeof point === 'number' && Number.isFinite(point))
    : []
  return parsed.length ? parsed : [6]
}

function buildAdCopy(advertiser: AdvertiserAsset, format: AdFormat, variant: 'A' | 'B') {
  if (format === 'character-match') return variant === 'A' ? `${advertiser.productName}，同款灵感入戏` : `${advertiser.brandName}，把剧感带回日常`
  if (format === 'buffer-card') return variant === 'A' ? `剧情暂停一秒，${advertiser.brandName}轻轻出现` : `下一幕之前，留一点${advertiser.brandTone.split('、')[0]}`
  return variant === 'A' ? `${advertiser.brandName} ${advertiser.productName}` : `${advertiser.keySellingPoint.slice(0, 24)}...`
}

function buildVideoPrompt(advertiser: AdvertiserAsset, format: AdFormat, sceneType: string, variant: 'A' | 'B') {
  const camera = advertiser.cameraSuggestions[variant === 'A' ? 0 : 1] ?? 'cinematic camera movement'
  return `Cinematic ${AD_FORMAT_LABELS[format]} for ${advertiser.brandName} ${advertiser.productName}, scene-aware transition from ${sceneType}, ${camera}, natural product integration, soft lighting, playable short video.`
}

function buildLocalAdDirection({ advertiser, adFormat, sceneType, shortReason }: {
  advertiser: AdvertiserAsset
  adFormat: AdFormat
  sceneType: string
  shortReason: string
}): AdDirectionPackage {
  return {
    creativeBrief: `${sceneType}自然过渡到${advertiser.brandName}${advertiser.productName}，用${AD_FORMAT_LABELS[adFormat]}降低打扰感。`,
    sceneBridge: `承接原视频的${sceneType}情绪，在推荐插入点用相似光线、道具或动作 match cut 进入广告；${shortReason}`,
    shotList: [
      {
        shot: 1,
        timeRange: '0-3s',
        visual: `保留${sceneType}的光线和节奏，画面中先出现与剧情相近的环境物件。`,
        camera: advertiser.cameraSuggestions[0] ?? 'slow push-in, shallow depth of field',
        transition: 'match cut from original scene mood',
        productRole: `${advertiser.productName}作为道具或生活方式延伸轻量出现。`,
        subtitle: buildAdCopy(advertiser, adFormat, 'A'),
        voiceover: `这一刻，${advertiser.brandName}自然出现。`,
        sound: advertiser.audioSuggestions[0] ?? 'soft ambient sound',
      },
      {
        shot: 2,
        timeRange: '3-8s',
        visual: `${advertiser.assetVisualElements.slice(0, 3).join('、')}形成产品特写和使用动作。`,
        camera: advertiser.cameraSuggestions[1] ?? 'macro close-up with gentle motion',
        transition: 'soft dissolve with scene color continuity',
        productRole: `展示${advertiser.keySellingPoint}，但不做硬广叫卖。`,
        subtitle: buildAdCopy(advertiser, adFormat, 'B'),
        voiceover: advertiser.keySellingPoint,
        sound: advertiser.audioSuggestions[1] ?? 'light music cue',
      },
      {
        shot: 3,
        timeRange: '8-12s',
        visual: `品牌克制露出，画面淡出并准备回到剧情。`,
        camera: 'locked-off hero product shot with subtle parallax',
        transition: 'fade back to drama ambience',
        productRole: `${advertiser.brandName}露出不超过2秒，避免电商页感。`,
        subtitle: `${advertiser.brandName} · ${advertiser.productName}`,
        voiceover: '回到故事，也带着一点新的灵感。',
        sound: advertiser.audioSuggestions[2] ?? 'ambient tail',
      },
    ],
    voiceover: { content: `这一刻，${advertiser.brandName}自然出现。回到故事，也带着一点新的灵感。`, tone: '克制自然', voice: '温柔旁白', speed: '中慢', emotion: '低打扰' },
    voiceoverScript: `0-3秒：这一刻，${advertiser.brandName}自然出现。8-12秒：回到故事，也带着一点新的灵感。`,
    subtitles: [
      { timeRange: '0-3s', text: buildAdCopy(advertiser, adFormat, 'A'), maxChars: 16 },
      { timeRange: '8-12s', text: `${advertiser.brandName} · ${advertiser.productName}`, maxChars: 16 },
    ],
    subtitleScript: [
      { timeRange: '0-3s', text: buildAdCopy(advertiser, adFormat, 'A'), maxChars: 16 },
      { timeRange: '8-12s', text: `${advertiser.brandName} · ${advertiser.productName}`, maxChars: 16 },
    ],
    audioDirection: advertiser.audioSuggestions.join('、') || '延续原剧情环境声，轻音乐低打扰进入。',
    visualStyle: `cinematic, scene-aware transition, ${advertiser.cameraSuggestions.join(', ')}, lighting follows ${sceneType}, avoid cheap e-commerce layout`,
    productIntegration: `${advertiser.productName}作为道具、背景卡片或生活方式延伸，露出自然且短，不硬切电商页。`,
    negativePrompt: `no static poster, no giant text, no cheap e-commerce layout, no fake celebrity, no official drama collaboration claim, ${advertiser.forbiddenRepresentations.join(', ')}`,
  }
}

function buildLocalLibtvPrompt({ advertiser, adFormat, sceneType, shortReason, variant, adDirection }: {
  advertiser: AdvertiserAsset
  adFormat: AdFormat
  sceneType: string
  shortReason: string
  variant: 'A' | 'B'
  adDirection: AdDirectionPackage
}) {
  return `中文导演要求：生成${variant}版${AD_FORMAT_LABELS[adFormat]}，从“${sceneType}”自然承接；${shortReason}。必须包含三段分镜、镜头切换、旁白、字幕、商品露出方式和禁止事项。品牌/商品：${advertiser.brandName} ${advertiser.productName}。核心卖点：${advertiser.keySellingPoint}。分镜：${adDirection.shotList.map(shot => `镜头${shot.shot}${shot.timeRange}:${shot.visual}`).join('；')}。字幕：${adDirection.subtitleScript.map(line => `${line.timeRange}${line.text}`).join('；')}。旁白：${adDirection.voiceoverScript}。声音：${adDirection.audioDirection}。
English visual generation prompt: ${buildVideoPrompt(advertiser, adFormat, sceneType, variant)} Smooth camera movement, coherent transitions, cinematic lighting, natural product shot, realistic playable video.
Negative prompt: ${adDirection.negativePrompt}, no medical/absolute/superlative claims, no price bombing, no PPT, no static poster.
输出必须是真实可播放短视频文件，优先 mp4/webm/mov，不要只生成静态图。`
}

function buildFifteenSecScript(advertiser: AdvertiserAsset, format: AdFormat, sceneType: string) {
  return `0-3秒：承接${sceneType}的光线与节奏，低打扰进入${AD_FORMAT_LABELS[format]}。3-8秒：${advertiser.productName}以道具/生活方式方式出现，展示${advertiser.assetVisualElements.slice(0, 2).join('、')}。8-15秒：克制露出${advertiser.brandName}，淡出回剧情。`
}
