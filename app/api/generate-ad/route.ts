import { NextResponse } from 'next/server'
import { analyzeVideoAndGenerateAd } from '@/lib/kimi'
import { buildLibtvMessage, createLibtvSession, isLibtvConfigured } from '@/lib/libtv'
import { parseUserAdPreferences } from '@/lib/user-preferences'
import type { GenerateAdResponse, VideoFrameInput } from '@/types'

export async function POST(request: Request) {
  const { blobUrl, frames = [], userPreferences = null } = await request.json() as {
    blobUrl: string
    frames?: VideoFrameInput[]
    userPreferences?: unknown
  }

  if (!blobUrl) {
    return NextResponse.json({ error: 'blobUrl is required' }, { status: 400 })
  }

  // Fetch video from Vercel Blob. Kimi 当前走 Anthropic-compatible image blocks，
  // 这里仍保留原视频 base64 参数以兼容图片输入/未来扩展；视频本身不会作为 video block 发送给 Kimi。
  const videoRes = await fetch(blobUrl)
  if (!videoRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch video from Blob' }, { status: 502 })
  }

  const videoBuffer = await videoRes.arrayBuffer()
  const videoBase64 = Buffer.from(videoBuffer).toString('base64')
  const contentType = videoRes.headers.get('content-type') ?? 'video/mp4'
  const parsedPreferences = parseUserAdPreferences(
    typeof userPreferences === 'string' ? userPreferences : JSON.stringify(userPreferences)
  )

  let kimiResult: GenerateAdResponse
  try {
    kimiResult = await analyzeVideoAndGenerateAd(videoBase64, contentType, frames, parsedPreferences)
  } catch (err) {
    return NextResponse.json({ error: `Kimi error: ${(err as Error).message}` }, { status: 502 })
  }

  let sessionId = ''
  let sessionIdB = ''
  let libtv: GenerateAdResponse['libtv'] = {
    attempted: false,
    status: 'not-configured',
    error: 'LIBTV_ACCESS_KEY is missing; returning Kimi-generated ad card without video rendering.',
  }

  if (isLibtvConfigured()) {
    libtv = { attempted: true, status: 'queued' }
    try {
      const sessionA = await createLibtvSession(buildLibtvMessage({
        videoPrompt: kimiResult.videoPromptA,
        adFormat: kimiResult.adFormat,
        adCopy: kimiResult.adCopyA,
      }))
      sessionId = sessionA.sessionId
      libtv.projectUrlA = sessionA.projectUrl

      const sessionB = await createLibtvSession(buildLibtvMessage({
        videoPrompt: kimiResult.videoPromptB,
        adFormat: kimiResult.adFormat,
        adCopy: kimiResult.adCopyB,
      }))
      sessionIdB = sessionB.sessionId
      libtv.projectUrlB = sessionB.projectUrl
    } catch (err) {
      libtv = {
        attempted: true,
        status: 'error',
        error: (err as Error).message,
      }
      console.error('[generate-ad] Libtv error:', (err as Error).message)
    }
  }

  const response: GenerateAdResponse = {
    ...kimiResult,
    sessionId,
    sessionIdB,
    libtv,
  }

  return NextResponse.json(response)
}
