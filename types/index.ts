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

export interface GenerateAdResponse {
  sessionId: string
  sessionIdB?: string
  adCopyA: string
  adCopyB: string
  videoPromptA: string
  videoPromptB: string
  interactiveQuestion: string
  fifteenSecScript: string
  adFormat: AdFormat
  adFormatReason: string
  sceneAnalysis: SceneAnalysis
  rhythmTimeline: RhythmTimeline
}

export interface AdStatusResponse {
  status: 'pending' | 'done' | 'error'
  videoUrl?: string
  projectUrl?: string
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
