'use client'

import { useState, useCallback } from 'react'
import { upload } from '@vercel/blob/client'
import { extractVideoFrames } from '@/lib/video-frames'

interface VideoUploadProps {
  onUploadComplete: (blobUrl: string, objectUrl: string) => void
}

export default function VideoUpload({ onUploadComplete }: VideoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('请上传视频文件（MP4 / MOV / WebM）')
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('视频文件不能超过 100MB')
      return
    }

    setIsUploading(true)
    setError('')
    setProgress(0)

    try {
      const objectUrl = URL.createObjectURL(file)
      const [blob, frames] = await Promise.all([
        upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
        }),
        extractVideoFrames(file),
      ])

      sessionStorage.setItem('addrama_blob_url', blob.url)
      sessionStorage.setItem('addrama_video_name', file.name)
      sessionStorage.setItem('addrama_video_frames', JSON.stringify(frames))
      sessionStorage.removeItem('addrama_ad_result')
      onUploadComplete(blob.url, objectUrl)
    } catch (err) {
      setError(`上传失败：${(err as Error).message}`)
    } finally {
      setIsUploading(false)
    }
  }, [onUploadComplete])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div
      onDrop={onDrop}
      onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      className="relative rounded-xl p-10 text-center cursor-pointer transition-all"
      style={{
        border: `2px dashed ${isDragging ? 'var(--teal)' : 'var(--border)'}`,
        background: isDragging ? 'var(--teal-dim)' : 'var(--surface)',
      }}
      onClick={() => document.getElementById('video-input')?.click()}
    >
      <input
        id="video-input"
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {isUploading ? (
        <div className="flex flex-col items-center gap-4">
          <div className="text-3xl">⏳</div>
          <p className="font-bold" style={{ color: 'var(--teal)' }}>上传中… {progress}%</p>
          <div className="w-full rounded-full h-1.5" style={{ background: 'var(--border)' }}>
            <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--teal)' }} />
          </div>
        </div>
      ) : (
        <>
          <div className="text-4xl mb-3">🎬</div>
          <p className="font-bold text-base mb-1" style={{ color: 'var(--text)' }}>
            拖拽上传视频片段，或点击选择
          </p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            支持 MP4 · MOV · WebM &nbsp;·&nbsp; 最大 100MB
          </p>
          <p className="mt-3 text-xs font-mono-syne" style={{ color: 'var(--teal)' }}>
            上传后即可体验改造前 / 改造后广告效果
          </p>
        </>
      )}

      {error && (
        <p className="mt-3 text-sm" style={{ color: 'var(--red)' }}>{error}</p>
      )}
    </div>
  )
}
