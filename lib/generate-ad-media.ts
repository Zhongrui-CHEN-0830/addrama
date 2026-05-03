import type { VideoFrameInput } from '@/types'

export interface KimiMediaInput {
  mediaType: string
  mediaBase64: string
}

export async function prepareKimiMediaInput({
  blobUrl,
  frames,
  fetcher = fetch,
}: {
  blobUrl: string
  frames: VideoFrameInput[]
  fetcher?: typeof fetch
}): Promise<KimiMediaInput> {
  if (frames.length > 0) {
    return { mediaType: 'video/mp4', mediaBase64: '' }
  }

  const videoRes = await fetcher(blobUrl)
  if (!videoRes.ok) {
    throw new Error('Failed to fetch video from Blob')
  }

  const videoBuffer = await videoRes.arrayBuffer()
  return {
    mediaBase64: Buffer.from(videoBuffer).toString('base64'),
    mediaType: videoRes.headers.get('content-type') ?? 'video/mp4',
  }
}
