import { NextResponse } from 'next/server'
import { analyzeVideoAndGenerateAd } from '@/lib/kimi'
import { createLibtvSession } from '@/lib/libtv'
import type { AdvertiserInput, GenerateAdResponse, VideoFrameInput } from '@/types'

const DEFAULT_ADVERTISER: AdvertiserInput = {
  brandName: '某气泡水品牌',
  productName: '0糖0脂气泡水',
  keySellingPoint: '0糖0脂，清爽解腻',
  bannedWords: '最好、第一、绝对',
  targetAudience: '18-35岁年轻用户',
  brandTone: '清爽、活力、现代',
}

export async function POST(request: Request) {
  const { blobUrl, advertiser = DEFAULT_ADVERTISER, frames = [] } = await request.json() as {
    blobUrl: string
    advertiser?: AdvertiserInput
    frames?: VideoFrameInput[]
  }

  if (!blobUrl) {
    return NextResponse.json({ error: 'blobUrl is required' }, { status: 400 })
  }

  // Fetch video from Vercel Blob
  const videoRes = await fetch(blobUrl)
  if (!videoRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch video from Blob' }, { status: 502 })
  }

  const videoBuffer = await videoRes.arrayBuffer()
  const videoBase64 = Buffer.from(videoBuffer).toString('base64')
  const contentType = videoRes.headers.get('content-type') ?? 'video/mp4'

  // Call Kimi k2.6
  let kimiResult: GenerateAdResponse
  try {
    kimiResult = await analyzeVideoAndGenerateAd(videoBase64, contentType, advertiser, frames)
  } catch (err) {
    return NextResponse.json({ error: `Kimi error: ${(err as Error).message}` }, { status: 502 })
  }

  // Start Libtv session for version A
  let sessionId = ''
  let sessionIdB = ''
  try {
    const sessionA = await createLibtvSession(kimiResult.videoPromptA)
    sessionId = sessionA.sessionId

    const sessionB = await createLibtvSession(kimiResult.videoPromptB)
    sessionIdB = sessionB.sessionId
  } catch (err) {
    // Non-fatal: return Kimi result even if Libtv fails
    console.error('[generate-ad] Libtv error:', (err as Error).message)
  }

  const response: GenerateAdResponse = {
    ...kimiResult,
    sessionId,
    sessionIdB,
  }

  return NextResponse.json(response)
}
