import type { AdDirectionPackage, AdFormat, AdStatusResponse, AdvertiserAsset, PromptQualityGate } from '@/types'

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

const AD_FORMAT_LABELS: Record<AdFormat, string> = {
  short: '普通短广告',
  'buffer-card': '剧情缓冲卡',
  'character-match': '角色同款推荐',
  interactive: '互动选择广告',
  'drama-style': 'AI短剧式广告',
  'end-card': '片尾低打扰广告',
}

const AD_FORMAT_DIRECTIVES: Record<AdFormat, string> = {
  short: '节奏明快，3-5个镜头，产品出现自然，不要硬切促销页；镜头1承接剧情气氛，镜头2呈现产品动作，镜头3克制品牌露出。',
  'buffer-card': '做成剧情缓冲卡：它是剧情章节之间的高级动态转场，而不是插播硬广。3-8秒，保留原剧情情绪余韵，使用少量动效、环境氛围、产品作为轻量陪伴；观众应该感觉“这是剧情呼吸点”。不要价格、不要强 CTA、不要电商叫卖。',
  'character-match': '做成角色同款推荐：先呼应角色妆造/服装/道具/生活方式，再呈现商品同款灵感；镜头1：从当前剧情情绪或角色细节自然过渡，镜头2：用商品材质/色彩/使用动作呼应角色气质，镜头3：以轻量同款灵感卡收束。不宣称官方联名，不要使用真实演员姓名。',
  interactive: '做成互动选择广告：提出一个低打扰选择题，画面给出两种选择动线，但仍必须生成完整可播放视频；互动选项应短、清楚、与剧情处境有关。',
  'drama-style': '做成AI短剧式广告：用微剧情讲卖点，结构必须是开端：一个与当前剧情相似的生活化小冲突；转折：品牌/商品以道具或解决方案自然出现；解决：情绪缓和并克制露出品牌。像相似情绪结构的番外短剧，不要冒充原剧官方剧情，不要传统TVC叫卖。',
  'end-card': '做成片尾低打扰广告：适合下一集前/暂停页，信息清晰、安静高级、品牌露出克制；保留“下一集前的余味”，不要突然强促销。',
}

function formatList(label: string, values?: string[]) {
  return values?.length ? `${label}：${values.join('、')}` : ''
}

function formatAdDirection(adDirection?: AdDirectionPackage) {
  if (!adDirection) return ''

  const shotList = adDirection.shotList
    ?.map(shot => [
      `镜头${shot.shot}（${shot.timeRange}）`,
      `visual: ${shot.visual}`,
      `camera: ${shot.camera}`,
      `transition: ${shot.transition}`,
      `productRole: ${shot.productRole}`,
      `subtitle: ${shot.subtitle}`,
      `voiceover: ${shot.voiceover}`,
      `sound: ${shot.sound}`,
    ].join('；'))
    .join('\n')

  const subtitleScript = (adDirection.subtitleScript ?? adDirection.subtitles ?? [])
    .map(line => `${line.timeRange}: ${line.text}${line.maxChars ? `（≤${line.maxChars}字）` : ''}`)
    .join('\n')

  return [
    'Kimi AdDirectionPackage / Libtv导演分镜包：',
    `creativeBrief: ${adDirection.creativeBrief}`,
    `sceneBridge: ${adDirection.sceneBridge}`,
    shotList ? `shotList:\n${shotList}` : '',
    `voiceover: ${adDirection.voiceover?.content ?? ''}；tone=${adDirection.voiceover?.tone ?? ''}；voice=${adDirection.voiceover?.voice ?? ''}；speed=${adDirection.voiceover?.speed ?? ''}；emotion=${adDirection.voiceover?.emotion ?? ''}`,
    `voiceoverScript: ${adDirection.voiceoverScript}`,
    subtitleScript ? `subtitleScript:\n${subtitleScript}` : '',
    `audioDirection: ${adDirection.audioDirection}`,
    `visualStyle: ${adDirection.visualStyle}`,
    `productIntegration: ${adDirection.productIntegration}`,
    `negativePrompt: ${adDirection.negativePrompt}`,
  ].filter(Boolean).join('\n')
}

function formatPromptQualityGate(gate?: PromptQualityGate) {
  if (!gate) return ''
  return [
    `Prompt Quality Gate: ${gate.passed ? 'passed' : 'failed'}`,
    gate.checkedItems?.length ? `checkedItems: ${gate.checkedItems.join('、')}` : '',
    gate.missingItems?.length ? `missingItems: ${gate.missingItems.join('、')}` : 'missingItems: none',
    gate.revisionNote ? `revisionNote: ${gate.revisionNote}` : '',
  ].filter(Boolean).join('\n')
}

export function buildLibtvMessage({
  videoPrompt,
  libtvPrompt,
  adFormat,
  adCopy,
  advertiser,
  sceneContext,
  script,
  adDirection,
  promptQualityGate,
}: {
  videoPrompt: string
  libtvPrompt?: string
  adFormat?: AdFormat
  adCopy?: string
  advertiser?: AdvertiserAsset
  sceneContext?: string
  script?: string
  adDirection?: AdDirectionPackage
  promptQualityGate?: PromptQualityGate
}) {
  const formatLabel = adFormat ? AD_FORMAT_LABELS[adFormat] : ''
  const bannedWords = advertiser?.bannedWords
    ?.split(/[、,，\s]+/)
    .map(word => word.trim())
    .filter(Boolean)
    .join('、')

  return [
    '你是 Libtv/Seedance 视频广告导演。请根据以下结构化素材，生成一个适合 16:9 播放的高质量短视频广告。',
    '硬性要求：必须生成真实可播放视频（优先 mp4/webm/mov），不要只生成静态海报、单张图片或文字策划；画面必须有连续镜头运动、转场和产品露出。',
    '视频规格：16:9，电影感，清晰商品主体，中文品牌/商品文字尽量少且准确；总时长建议 6-15 秒。',
    '全局合规：以中文结构化要求为最高优先级；禁止词不得出现在字幕、旁白、画面文字或隐含功效承诺中；不要使用真实演员姓名，不宣称官方联名，不仿冒原剧片段。',
    libtvPrompt ? '优先采用 Kimi 已生成的完整 Libtv 导演提示词；下方结构化素材只用于补强和合规校验，不要退化成单句 videoPrompt。' : '',
    libtvPrompt ? `Kimi完整Libtv导演提示词：\n${libtvPrompt}` : '',
    adFormat ? `广告形式：${formatLabel}` : '',
    adFormat ? `形式导演要求：${AD_FORMAT_DIRECTIVES[adFormat]}` : '',
    advertiser ? `品牌：${advertiser.brandName}` : '',
    advertiser ? `商品：${advertiser.productName}` : '',
    advertiser ? `行业：${advertiser.industry}` : '',
    advertiser ? `核心卖点：${advertiser.keySellingPoint}` : '',
    advertiser ? `品牌调性：${advertiser.brandTone}` : '',
    advertiser ? `目标人群：${advertiser.targetAudience}` : '',
    advertiser ? `可用原始素材/视觉元素：${advertiser.sourceMaterial}` : '',
    advertiser ? formatList('assetVisualElements', advertiser.assetVisualElements) : '',
    advertiser ? formatList('usageScenarios', advertiser.usageScenarios) : '',
    advertiser ? formatList('emotionalMapping', advertiser.emotionalMapping) : '',
    advertiser ? formatList('cameraSuggestions', advertiser.cameraSuggestions) : '',
    advertiser ? formatList('audioSuggestions', advertiser.audioSuggestions) : '',
    advertiser ? formatList('forbiddenRepresentations', advertiser.forbiddenRepresentations) : '',
    advertiser?.formatFit && adFormat && advertiser.formatFit[adFormat] ? `formatFit.${adFormat}: ${advertiser.formatFit[adFormat]}` : '',
    bannedWords ? `禁止出现或暗示的词：${bannedWords}` : '',
    sceneContext ? `剧集场景上下文：${sceneContext}` : '',
    adCopy ? `核心文案：${adCopy}` : '',
    script ? `建议三段式镜头脚本：${script}` : '',
    formatAdDirection(adDirection),
    formatPromptQualityGate(promptQualityGate),
    libtvPrompt ? `兼容旧字段 videoPrompt 摘要（仅作视觉补充，不可替代完整导演包）：${videoPrompt}` : `视频创意英文提示词：${videoPrompt}`,
    '输出目标：让广告像剧情自然延伸的一张动态卡/同款推荐/短剧番外，避免廉价模板感、硬促销、大字报、过度闪烁、违规功效承诺。',
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
