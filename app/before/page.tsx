'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getRandomAd } from '@/lib/mock-ads'
import type { MockAd } from '@/types'

const EMOTIONS = [
  '😤 为什么这时候来广告？',
  '😒 和我看的内容有什么关系？',
  '😑 我根本不想看',
  '😡 想直接退出',
  '🙄 又是这个广告',
  '😤 剧情还没完呢！',
]

function getTraditionalAdTriggerSecond(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return 20
  return Math.min(20, Math.max(1, duration * 0.6))
}

export default function BeforePage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasTriggeredAdRef = useRef(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [adActive, setAdActive] = useState(false)
  const [adCountdown, setAdCountdown] = useState(30)
  const [ad, setAd] = useState<MockAd | null>(null)
  const [bubbles, setBubbles] = useState<Array<{ id: number; text: string; x: number; y: number }>>([])
  const [showNext, setShowNext] = useState(false)

  const triggerTraditionalAd = useCallback(() => {
    if (hasTriggeredAdRef.current) return
    hasTriggeredAdRef.current = true
    videoRef.current?.pause()
    setAd(getRandomAd())
    setAdActive(true)
    setAdCountdown(30)
  }, [])

  useEffect(() => {
    const url = sessionStorage.getItem('addrama_blob_url')
    if (!url) { router.push('/'); return }
    window.setTimeout(() => setVideoUrl(url), 0)

    const frames = JSON.parse(sessionStorage.getItem('addrama_video_frames') ?? '[]')

    // Start background Kimi analysis
    fetch('/api/generate-ad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blobUrl: url, frames }),
    }).then(r => r.json()).then(data => {
      sessionStorage.setItem('addrama_ad_result', JSON.stringify(data))
    }).catch(console.error)
  }, [router])

  // Traditional ad trigger. Long videos use 20s; short videos trigger at 60% duration.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoUrl) return

    const handleTimeUpdate = () => {
      const triggerAt = getTraditionalAdTriggerSecond(video.duration)
      if (video.currentTime >= triggerAt) {
        triggerTraditionalAd()
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', triggerTraditionalAd)
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', triggerTraditionalAd)
    }
  }, [triggerTraditionalAd, videoUrl])

  // Emotion bubbles
  useEffect(() => {
    if (!adActive) return
    let counter = 0
    const interval = setInterval(() => {
      const text = EMOTIONS[counter % EMOTIONS.length]
      setBubbles(prev => [
        ...prev.slice(-4),
        { id: Date.now(), text, x: 10 + Math.random() * 60, y: 20 + Math.random() * 50 }
      ])
      counter++
    }, 900)
    return () => clearInterval(interval)
  }, [adActive])

  // Ad countdown
  useEffect(() => {
    if (!adActive) return
    if (adCountdown <= 0) {
      const t = setTimeout(() => {
        setAdActive(false)
        setShowNext(true)
        videoRef.current?.play().catch(() => {})
      }, 0)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setAdCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [adActive, adCountdown])

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
        <h2 className="font-display text-3xl mb-1" style={{ color: 'var(--red)' }}>改造前体验</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>传统广告：无关内容，粗暴打断</p>
      </motion.div>

      <div className="relative rounded-xl overflow-hidden" style={{ background: '#000', aspectRatio: '16/9' }}>
        {videoUrl && (
          <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" autoPlay muted />
        )}

        {/* Ad overlay */}
        <AnimatePresence>
          {adActive && ad && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ background: ad.bgColor + 'ee' }}
            >
              <div className="text-center px-8">
                <p className="text-xs font-mono-syne mb-4" style={{ color: 'var(--muted)' }}>
                  广告 · {adCountdown > 0 ? `不可跳过 · 剩余 ${adCountdown} 秒` : '广告结束'}
                </p>
                <p className="font-bold text-xl mb-2" style={{ color: 'var(--text)' }}>{ad.title}</p>
                <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>{ad.subtitle}</p>
                <p className="text-xs font-mono-syne mt-4" style={{ color: 'var(--red)' }}>
                  【与正在观看的内容完全无关】
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>品类：{ad.category}</p>
              </div>

              {/* Emotion bubbles */}
              {bubbles.map(b => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: -20 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2 }}
                  className="absolute text-xs px-3 py-1.5 rounded-full font-bold"
                  style={{
                    left: `${b.x}%`,
                    top: `${b.y}%`,
                    background: 'var(--red-dim)',
                    border: '1px solid var(--red)',
                    color: 'var(--red)',
                    pointerEvents: 'none',
                  }}
                >
                  {b.text}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showNext && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            ↑ 这就是传统广告的体验。AI 能做得更好吗？
          </p>
          <button
            onClick={() => router.push('/ai-analysis')}
            className="px-8 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80"
            style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal)', color: 'var(--teal)' }}
          >
            下一步：看 AI 如何决策 →
          </button>
        </motion.div>
      )}
    </main>
  )
}
