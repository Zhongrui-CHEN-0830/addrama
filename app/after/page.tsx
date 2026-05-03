'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import AdCard from '@/components/AdCard'
import UserPreference from '@/components/UserPreference'
import RhythmTimeline from '@/components/RhythmTimeline'
import AdvertiserForm from '@/components/AdvertiserForm'
import { getErrorMessage, isGenerateAdResponse } from '@/lib/ad-result'
import { USER_AD_PREFERENCES_STORAGE_KEY } from '@/lib/user-preferences'
import type { GenerateAdResponse } from '@/types'

function chooseInsertPoint(result: GenerateAdResponse | null, duration: number) {
  const recommended = result?.rhythmTimeline?.recommendedInsertPoints?.find(point => point > 0)
  if (recommended && Number.isFinite(duration) && recommended < duration - 1) return recommended
  if (Number.isFinite(duration) && duration > 0) return Math.max(3, Math.min(35, duration * 0.5))
  return 8
}

export default function AfterPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const adTriggeredRef = useRef(false)
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
  const [preferenceSaved, setPreferenceSaved] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startPolling = useCallback((sessionIdA: string, sessionIdB = '') => {
    const sessionIds = [sessionIdA, sessionIdB].filter(Boolean)
    if (sessionIds.length === 0) return
    setIsPolling(true)
    let attempts = 0

    pollingRef.current = setInterval(async () => {
      attempts++
      if (attempts > 24) {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setIsPolling(false)
        return
      }

      for (const sessionId of sessionIds) {
        try {
          const res = await fetch(`/api/ad-status/${sessionId}`)
          const data = await res.json()
          if (data.status === 'done' && data.videoUrl) {
            setAdVideoUrl(data.videoUrl)
            if (pollingRef.current) clearInterval(pollingRef.current)
            setIsPolling(false)
            return
          }
        } catch {}
      }
    }, 8000)
  }, [])

  useEffect(() => {
    const blobUrl = sessionStorage.getItem('addrama_blob_url')
    if (!blobUrl) { router.push('/'); return }
    window.setTimeout(() => setVideoUrl(blobUrl), 0)

    const cached = sessionStorage.getItem('addrama_ad_result')
    if (cached) {
      try {
        const data: unknown = JSON.parse(cached)
        if (isGenerateAdResponse(data)) {
          window.setTimeout(() => {
            setResult(data)
            startPolling(data.sessionId, data.sessionIdB)
          }, 0)
          return
        }
        window.setTimeout(() => setAnalysisError(getErrorMessage(data)), 0)
      } catch {}
    }

    const frames = JSON.parse(sessionStorage.getItem('addrama_video_frames') ?? '[]')
    const userPreferences = sessionStorage.getItem(USER_AD_PREFERENCES_STORAGE_KEY)

    window.setTimeout(() => setIsAnalyzing(true), 0)
    fetch('/api/generate-ad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blobUrl, frames, userPreferences }),
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
        startPolling(data.sessionId, data.sessionIdB)
      })
      .catch(err => setAnalysisError((err as Error).message))
      .finally(() => setIsAnalyzing(false))

    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [router, startPolling])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handler = () => {
      setCurrentSec(Math.floor(video.currentTime))

      const insertPoint = chooseInsertPoint(result, video.duration)
      const avoidPoint = Math.max(1, insertPoint - 6)
      if (video.currentTime >= avoidPoint && video.currentTime < avoidPoint + 2) {
        setShowAvoidBanner(true)
      }
      if (video.currentTime >= avoidPoint + 2) {
        setShowAvoidBanner(false)
      }

      if (!adTriggeredRef.current && video.currentTime >= insertPoint) {
        adTriggeredRef.current = true
        video.pause()
        setShowAdCard(true)
      }
    }

    const ended = () => {
      if (!adTriggeredRef.current) {
        adTriggeredRef.current = true
        setShowAdCard(true)
      }
    }

    video.addEventListener('timeupdate', handler)
    video.addEventListener('ended', ended)
    return () => {
      video.removeEventListener('timeupdate', handler)
      video.removeEventListener('ended', ended)
    }
  }, [result])

  function handleAdInteract() {
    setShowPreference(true)
  }

  const durationSec = Math.max(60, result?.rhythmTimeline?.segments?.at(-1)?.endSec ?? 240)

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
        <p className="text-xs font-mono-syne tracking-widest mb-1" style={{ color: 'var(--teal)' }}>
          ADDRAMA AI · 改造后体验
        </p>
        <h2 className="font-display text-3xl mb-1" style={{ color: 'var(--teal)' }}>AI 驱动广告</h2>
        <p className="text-sm" style={{ color: analysisError ? 'var(--red)' : 'var(--muted)' }}>
          {analysisError || (isAnalyzing ? 'Kimi 正在分析关键帧并选择广告素材…' : 'AI 已分析视频，将在合适时机展示场景化广告')}
        </p>
      </motion.div>

      <div className="relative rounded-xl overflow-hidden mb-4" style={{ background: '#000', aspectRatio: '16/9' }}>
        {videoUrl && (
          <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" autoPlay muted />
        )}

        <AnimatePresence>
          {showAvoidBanner && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 left-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
              style={{ background: 'rgba(0,212,170,0.15)', border: '1px solid var(--teal)', color: 'var(--teal)' }}
            >
              ✦ AI 已避开关键剧情点，等待更自然的广告窗口…
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {result?.selectedAdvertiser && (
        <div className="mb-4 rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--gold)' }}>
          <p className="text-[9px] font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>AI 匹配广告素材</p>
          <p className="font-bold text-sm" style={{ color: 'var(--gold)' }}>
            {result.selectedAdvertiser.industry} · {result.selectedAdvertiser.brandName} · {result.selectedAdvertiser.productName}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{result.selectedAdvertiser.matchReason}</p>
          {result.libtv && (
            <p className="text-[10px] mt-2" style={{ color: result.libtv.status === 'error' ? 'var(--red)' : 'var(--teal)' }}>
              Libtv: {result.libtv.status === 'queued' ? '已创建生成任务，正在异步渲染' : result.libtv.error}
            </p>
          )}
        </div>
      )}

      {result && (
        <div className="mb-4 rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <RhythmTimeline timeline={result.rhythmTimeline} durationSec={durationSec} currentSec={currentSec} />
        </div>
      )}

      {result && (
        <div className="mb-4">
          <AdvertiserForm />
        </div>
      )}

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

      <AnimatePresence>
        {showPreference && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <UserPreference onSaved={() => setPreferenceSaved(true)} />
          </motion.div>
        )}
      </AnimatePresence>

      {preferenceSaved && (
        <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal)', color: 'var(--teal)' }}>
          已记录到本次 demo 会话。AI 将减少你不喜欢的类型，并优先尝试更短/更相关的广告形式。
        </div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap justify-end gap-3">
        <button
          onClick={() => setShowAdCard(true)}
          className="px-5 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80"
          style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal)', color: 'var(--teal)' }}
        >
          立即查看 AI 广告 →
        </button>
        <button
          onClick={() => router.push('/ai-analysis')}
          className="px-5 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80"
          style={{ background: 'var(--purple-dim)', border: '1px solid var(--purple)', color: 'var(--purple)' }}
        >
          查看 AI 决策 →
        </button>
        <button
          onClick={() => router.push('/value')}
          className="px-8 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80"
          style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold)', color: 'var(--gold)' }}
        >
          查看三方价值 →
        </button>
      </motion.div>
    </main>
  )
}
