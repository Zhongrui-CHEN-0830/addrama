'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import AdCard from '@/components/AdCard'
import UserPreference from '@/components/UserPreference'
import RhythmTimeline from '@/components/RhythmTimeline'
import AdvertiserForm from '@/components/AdvertiserForm'
import { getErrorMessage, isGenerateAdResponse } from '@/lib/ad-result'
import type { GenerateAdResponse } from '@/types'

export default function AfterPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [result, setResult] = useState<GenerateAdResponse | null>(null)
  const [analysisError, setAnalysisError] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentSec, setCurrentSec] = useState(0)
  const [showAvoidBanner, setShowAvoidBanner] = useState(false)
  const [showAdCard, setShowAdCard] = useState(false)
  const [adVideoUrl, setAdVideoUrl] = useState('')
  const [isPolling, setIsPolling] = useState(false)
  const [showPreference, setShowPreference] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startPolling = useCallback((sessionId: string) => {
    if (!sessionId) return
    setIsPolling(true)
    let attempts = 0

    pollingRef.current = setInterval(async () => {
      attempts++
      if (attempts > 12) { // 96s timeout
        clearInterval(pollingRef.current!)
        setIsPolling(false)
        return
      }

      try {
        const res = await fetch(`/api/ad-status/${sessionId}`)
        const data = await res.json()
        if (data.status === 'done' && data.videoUrl) {
          setAdVideoUrl(data.videoUrl)
          clearInterval(pollingRef.current!)
          setIsPolling(false)
        }
      } catch {}
    }, 8000)
  }, [])

  useEffect(() => {
    const blobUrl = sessionStorage.getItem('addrama_blob_url')
    if (!blobUrl) { router.push('/'); return }
    setVideoUrl(blobUrl)

    // Load cached result or fetch fresh
    const cached = sessionStorage.getItem('addrama_ad_result')
    if (cached) {
      try {
        const data: unknown = JSON.parse(cached)
        if (isGenerateAdResponse(data)) {
          setResult(data)
          startPolling(data.sessionId)
          return
        }
        setAnalysisError(getErrorMessage(data))
      } catch {}
    }

    // Fetch fresh
    setIsAnalyzing(true)
    fetch('/api/generate-ad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blobUrl }),
    })
      .then(async r => {
        const data: unknown = await r.json()
        if (!r.ok || !isGenerateAdResponse(data)) {
          throw new Error(getErrorMessage(data))
        }
        return data
      })
      .then((data: GenerateAdResponse) => {
        setAnalysisError('')
        setResult(data)
        sessionStorage.setItem('addrama_ad_result', JSON.stringify(data))
        startPolling(data.sessionId)
      })
      .catch(err => setAnalysisError((err as Error).message))
      .finally(() => setIsAnalyzing(false))

    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [router, startPolling])

  // Video time tracking
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handler = () => {
      setCurrentSec(Math.floor(video.currentTime))

      // At 20s: show "AI avoided this point" banner
      if (video.currentTime >= 20 && video.currentTime < 22) {
        setShowAvoidBanner(true)
      }
      if (video.currentTime >= 22) {
        setShowAvoidBanner(false)
      }

      // At 35s: show ad card
      if (video.currentTime >= 35 && !showAdCard) {
        video.pause()
        setShowAdCard(true)
      }
    }
    video.addEventListener('timeupdate', handler)
    return () => video.removeEventListener('timeupdate', handler)
  }, [showAdCard])

  function handleAdInteract() {
    setShowPreference(true)
  }

  const MOCK_DURATION = 240

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
        <p className="text-xs font-mono-syne tracking-widest mb-1" style={{ color: 'var(--teal)' }}>
          ADDRAMA AI · 改造后体验
        </p>
        <h2 className="font-display text-3xl mb-1" style={{ color: 'var(--teal)' }}>AI 驱动广告</h2>
        <p className="text-sm" style={{ color: analysisError ? 'var(--red)' : 'var(--muted)' }}>
          {analysisError || (isAnalyzing ? 'Kimi k2.6 正在分析视频…' : 'AI 已分析视频，将在合适时机展示场景化广告')}
        </p>
      </motion.div>

      {/* Video player */}
      <div className="relative rounded-xl overflow-hidden mb-4" style={{ background: '#000', aspectRatio: '16/9' }}>
        {videoUrl && (
          <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" autoPlay muted />
        )}

        {/* "AI avoided" banner at 20s */}
        <AnimatePresence>
          {showAvoidBanner && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 left-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
              style={{ background: 'rgba(0,212,170,0.15)', border: '1px solid var(--teal)', color: 'var(--teal)' }}
            >
              ✦ AI 已避开此处（传统广告插入点）— 等待平缓转场…
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rhythm timeline */}
      {result && (
        <div className="mb-4 rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <RhythmTimeline
            timeline={result.rhythmTimeline}
            durationSec={MOCK_DURATION}
            currentSec={currentSec}
          />
        </div>
      )}

      {/* Advertiser form */}
      {result && (
        <div className="mb-4">
          <AdvertiserForm />
        </div>
      )}

      {/* Ad card */}
      <AnimatePresence>
        {showAdCard && result && (
          <div className="mb-4">
            <AdCard
              adCopy={result.adCopyA}
              interactiveQuestion={result.interactiveQuestion}
              videoUrl={adVideoUrl || undefined}
              isLoading={isPolling && !adVideoUrl}
              onInteract={handleAdInteract}
            />
          </div>
        )}
      </AnimatePresence>

      {/* User preference */}
      <AnimatePresence>
        {showPreference && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <UserPreference />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      {showAdCard && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-end"
        >
          <button
            onClick={() => router.push('/value')}
            className="px-8 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80"
            style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold)', color: 'var(--gold)' }}
          >
            查看三方价值 →
          </button>
        </motion.div>
      )}
    </main>
  )
}
