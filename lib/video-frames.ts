'use client'

import type { VideoFrameInput } from '@/types'

export const DEFAULT_FRAME_COUNT = 12
const DEFAULT_MAX_WIDTH = 512
const JPEG_QUALITY = 0.72

function seekVideo(video: HTMLVideoElement, timeSec: number) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener('seeked', handleSeeked)
      video.removeEventListener('error', handleError)
    }
    const handleSeeked = () => {
      cleanup()
      resolve()
    }
    const handleError = () => {
      cleanup()
      reject(new Error('Failed to seek uploaded video while extracting frames'))
    }
    video.addEventListener('seeked', handleSeeked, { once: true })
    video.addEventListener('error', handleError, { once: true })
    video.currentTime = Math.min(Math.max(timeSec, 0), Number.isFinite(video.duration) ? video.duration : timeSec)
  })
}

function loadMetadata(video: HTMLVideoElement) {
  return new Promise<void>((resolve, reject) => {
    if (Number.isFinite(video.duration) && video.duration > 0 && video.videoWidth > 0) {
      resolve()
      return
    }

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('error', handleError)
    }
    const handleLoadedMetadata = () => {
      cleanup()
      resolve()
    }
    const handleError = () => {
      cleanup()
      reject(new Error('Failed to load uploaded video metadata'))
    }
    video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })
    video.addEventListener('error', handleError, { once: true })
  })
}

export function buildVideoFrameTimes(duration: number, count: number) {
  if (!Number.isFinite(duration) || duration <= 0) return [0]
  const safeCount = Math.max(1, count)
  const start = Math.min(1.2, duration * 0.05)
  const end = Math.max(start, duration - Math.min(1.2, duration * 0.05))

  if (safeCount === 1) return [Number(Math.min(start, duration).toFixed(1))]

  return Array.from({ length: safeCount }, (_, index) => {
    const ratio = index / (safeCount - 1)
    return Number(Math.min(duration, start + (end - start) * ratio).toFixed(1))
  })
}

export async function extractVideoFrames(
  file: File,
  options: { frameCount?: number; maxWidth?: number } = {}
): Promise<VideoFrameInput[]> {
  const objectUrl = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'metadata'
  video.crossOrigin = 'anonymous'
  video.src = objectUrl

  try {
    await loadMetadata(video)

    const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH
    const scale = Math.min(1, maxWidth / Math.max(video.videoWidth, 1))
    const width = Math.max(1, Math.round(video.videoWidth * scale))
    const height = Math.max(1, Math.round(video.videoHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D context is unavailable')

    const frames: VideoFrameInput[] = []
    for (const timeSec of buildVideoFrameTimes(video.duration, options.frameCount ?? DEFAULT_FRAME_COUNT)) {
      await seekVideo(video, timeSec)
      context.drawImage(video, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
      const imageBase64 = dataUrl.split(',')[1]
      if (imageBase64) {
        frames.push({
          timestampSec: Number(timeSec.toFixed(1)),
          imageBase64,
          mediaType: 'image/jpeg',
        })
      }
    }

    return frames
  } finally {
    URL.revokeObjectURL(objectUrl)
    video.removeAttribute('src')
    video.load()
  }
}
