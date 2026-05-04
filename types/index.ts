export interface RhythmSegment {
  startSec: number
  endSec: number
  risk: 'red' | 'yellow' | 'green'
  reason: string
  emotionScore: number
}

export interface RhythmTimeline {
  segments: RhythmSegment[]
  recommendedInsertPoints: number[]
}

export interface SceneAnalysis {
  sceneType: string
  emotionScore: number
  tags: string[]
  advertisingRisk: 'high' | 'medium' | 'low'
  recommendedAdType: string
  reasoning: string
}

export type AdFormat =
  | 'short'
  | 'buffer-card'
  | 'character-match'
  | 'interactive'
  | 'drama-style'
  | 'end-card'

export interface AdvertiserAsset {
  id: string
  industry: string
  brandName: string
  productName: string
  sourceMaterial: string
  keySellingPoint: string
  targetAudience: string
  brandTone: string
  bannedWords: string
  suitableScenes: string[]
  suitableFormats: AdFormat[]
  budgetTier: 'low' | 'medium' | 'high'
  assetVisualElements: string[]
  usageScenarios: string[]
  emotionalMapping: string[]
  cameraSuggestions: string[]
  audioSuggestions: string[]
  forbiddenRepresentations: string[]
  formatFit: Partial<Record<AdFormat, string>>
}

export interface SelectedAdvertiser {
  id: string
  industry: string
  brandName: string
  productName: string
  matchReason: string
}

export interface EmotionCurvePoint {
  timeRange: string
  emotion: string
  intensity: number
}

export interface VideoSceneUnderstanding {
  sceneType: string
  emotionCurve: EmotionCurvePoint[]
  rhythmTimeline: RhythmTimeline
  visualMotifs: string[]
  characterState: string
  adInsertionRisk: 'high' | 'medium' | 'low'
  bestInsertReason: string
}

export interface AdDirectionShot {
  shot: number
  timeRange: string
  visual: string
  camera: string
  transition: string
  productRole: string
  subtitle: string
  voiceover: string
  sound: string
}

export interface SubtitleLine {
  timeRange: string
  text: string
  maxChars?: number
}

export interface VoiceoverDirection {
  content: string
  tone: string
  voice?: string
  speed?: string
  emotion?: string
}

export interface AdDirectionPackage {
  creativeBrief: string
  sceneBridge: string
  shotList: AdDirectionShot[]
  voiceover: VoiceoverDirection
  voiceoverScript: string
  subtitles: SubtitleLine[]
  subtitleScript: SubtitleLine[]
  audioDirection: string
  visualStyle: string
  productIntegration: string
  negativePrompt: string
}

export interface PromptQualityGate {
  passed: boolean
  checkedItems: string[]
  missingItems: string[]
  revisionNote?: string
}

export interface LibtvDirectorPackage {
  sceneAnalysis: VideoSceneUnderstanding
  adDirection: AdDirectionPackage
  promptQualityGate?: PromptQualityGate
}

export interface GenerateAdResponse {
  sessionId?: string
  sessionIdB?: string
  adCopyA: string
  adCopyB: string
  videoPromptA: string
  videoPromptB: string
  interactiveQuestion: string
  fifteenSecScript: string
  adFormat: AdFormat
  adFormatReason: string
  selectedAdvertiser?: SelectedAdvertiser
  videoSceneUnderstanding?: VideoSceneUnderstanding
  adDirection?: AdDirectionPackage
  promptQualityGate?: PromptQualityGate
  libtvPromptA?: string
  libtvPromptB?: string
  libtv?: {
    attempted: boolean
    status: 'not-configured' | 'queued' | 'error'
    error?: string
    projectUuidA?: string
    projectUuidB?: string
    projectUrlA?: string
    projectUrlB?: string
  }
  sceneAnalysis: SceneAnalysis
  rhythmTimeline: RhythmTimeline
}

export interface AdStatusResponse {
  status: 'pending' | 'done' | 'error'
  videoUrl?: string
  projectUrl?: string
  error?: string
}

export interface MockAd {
  id: string
  category: string
  title: string
  subtitle: string
  durationSec: number
  bgColor: string
}

export interface AdvertiserInput {
  brandName: string
  productName: string
  keySellingPoint: string
  bannedWords: string
  targetAudience: string
  brandTone: string
}

export interface VideoFrameInput {
  timestampSec: number
  imageBase64: string
  mediaType: string
}
