import { NextResponse } from 'next/server'
import type { VideoFrameInput } from '../../../types'
import { generateAdAnalysis } from '../../../lib/generate-ad-analysis'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const { blobUrl, frames = [], userPreferences = null } = await request.json() as {
      blobUrl: string
      frames?: VideoFrameInput[]
      userPreferences?: unknown
    }

    if (!blobUrl) {
      return NextResponse.json({ error: 'blobUrl is required' }, { status: 400 })
    }

    const result = await generateAdAnalysis({ blobUrl, frames, userPreferences })
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    const message = (err as Error).message || 'AI 分析失败：未知错误'
    console.error('[generate-ad] direct analysis failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
