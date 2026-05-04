'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import AdCard from '@/components/AdCard'
import UserPreference from '@/components/UserPreference'
import RhythmTimeline from '@/components/RhythmTimeline'
import { getErrorMessage, isGenerateAdResponse, readGenerateAdResponse } from '@/lib/ad-result'
import { chooseInsertPoint, formatMediaTime, shouldTriggerNonSkippableAd } from '@/lib/media-gate'
import { USER_AD_PREFERENCES_STORAGE_KEY } from '@/lib/user-preferences'
import type { GenerateAdResponse } from '@/types'

export default function AfterPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const adTriggeredRef = useRef(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [sourceVideoUrl, setSourceVideoUrl] = useState('')
  const [result, setResult] = useState<GenerateAdResponse | null>(null)
  const [analysisError, setAnalysisError] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentSec, setCurrentSec] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [showAvoidBanner, setShowAvoidBanner] = useState(false)
  const [showAdCard, setShowAdCard] = useState(false)
  const [adVideoUrl, setAdVideoUrl] = useState('')
  const [isPolling, setIsPolling] = useState(false)
  const [pollingMessage, setPollingMessage] = useState('')
  const [showPreference, setShowPreference] = useState(false)
  const [preferenceSaved, setPreferenceSaved] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startPolling = useCallback((sessionIdA: string, sessionIdB = '', projectUuidA = '', projectUuidB = '') => {
    const sessions = [
      { id: sessionIdA, projectUuid: projectUuidA },
      { id: sessionIdB, projectUuid: projectUuidB },
    ].filter(item => item.id)
    if (sessions.length === 0) return
    if (pollingRef.current) clearInterval(pollingRef.current)
    setIsPolling(true)
    setPollingMessage('Libtv 已创建任务，正在生成视频…')
    let attempts = 0

    const poll = async () => {
      attempts++
      if (attempts > 225) {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setIsPolling(false)
        setPollingMessage('Libtv 超过 30 分钟仍未返回可播放视频。请打开项目画布确认任务是否失败/排队，当前 demo 将展示广告库与 AI 选择理由。')
        return
      }

      for (const session of sessions) {
        try {
          const query = session.projectUuid ? `?projectUuid=${encodeURIComponent(session.projectUuid)}` : ''
          const res = await fetch(`/api/ad-status/${session.id}${query}`)
          const data = await res.json()
          if (data.status === 'done' && data.videoUrl) {
            setAdVideoUrl(data.videoUrl)
            if (pollingRef.current) clearInterval(pollingRef.current)
            setIsPolling(false)
            setPollingMessage('Libtv 广告视频已生成。')
            return
          }
          if (data.status === 'error') {
            setPollingMessage(`Libtv 查询失败：${data.error ?? '未知错误'}`)
          } else {
            setPollingMessage(`Libtv 正在生成中，已等待约 ${Math.floor((attempts * 8) / 60)} 分 ${attempts * 8 % 60} 秒…若 10 分钟仍无视频，通常是 Libtv 排队/任务失败/返回字段变化；下方广告库展示不依赖生成视频。`)
          }
        } catch {
          setPollingMessage('Libtv 状态查询暂时失败，继续重试…')
        }
      }
    }

    void poll()
    pollingRef.current = setInterval(poll, 8000)
  }, [])

  const startLibtvGeneration = useCallback((analysis: GenerateAdResponse) => {
    fetch('/api/generate-libtv-ad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis }),
    })
      .then(async response => {
        const data = await response.json()
        if (!response.ok || typeof data.jobId !== 'string') {
          throw new Error(typeof data.error === 'string' ? data.error : 'Libtv 生成任务启动失败')
        }
        setPollingMessage('Libtv 导演提示词已提交，正在创建视频生成任务…')
        setIsPolling(true)
        let attempts = 0
        const poll = async () => {
          attempts++
          const statusResponse = await fetch(`/api/generate-libtv-ad/${data.jobId}`)
          const state = await statusResponse.json()
          if (state.status === 'pending') {
            setPollingMessage(`Libtv 任务准备中：${state.stage ?? 'queued'}…`)
            return false
          }
          if (state.status === 'done') {
            const generated = state.result ?? {}
            const merged = {
              ...analysis,
              sessionId: generated.sessionId ?? '',
              sessionIdB: generated.sessionIdB ?? '',
              libtv: {
                attempted: Boolean(generated.attempted),
                status: generated.status ?? 'error',
                error: generated.error,
                projectUuidA: generated.projectUuidA,
                projectUuidB: generated.projectUuidB,
                projectUrlA: generated.projectUrlA,
                projectUrlB: generated.projectUrlB,
              },
            }
            setResult(merged)
            sessionStorage.setItem('addrama_ad_result', JSON.stringify(merged))
            startPolling(merged.sessionId ?? '', merged.sessionIdB, merged.libtv?.projectUuidA, merged.libtv?.projectUuidB)
            if (!merged.sessionId && generated.status === 'not-configured') {
              setIsPolling(false)
              setPollingMessage(generated.error ?? 'Libtv 未配置，当前 demo 展示 AI 广告卡。')
            }
            return true
          }
          setIsPolling(false)
          setPollingMessage(`Libtv 生成失败：${state.error ?? '未知错误'}`)
          return true
        }
        void poll().then(done => {
          if (done) return
          const interval = setInterval(() => {
            void poll().then(doneNow => {
              if (doneNow || attempts > 60) clearInterval(interval)
            }).catch(err => {
              setPollingMessage((err as Error).message || 'Libtv 状态查询失败')
              clearInterval(interval)
            })
          }, 2000)
        })
      })
      .catch(err => {
        setIsPolling(false)
        setPollingMessage((err as Error).message || 'Libtv 生成任务启动失败')
      })
  }, [startPolling])

  useEffect(() => {
    const blobUrl = sessionStorage.getItem('addrama_blob_url')
    if (!blobUrl) { router.push('/'); return }
    window.setTimeout(() => {
      setSourceVideoUrl(blobUrl)
      setVideoUrl(blobUrl)
    }, 0)

    const cached = sessionStorage.getItem('addrama_ad_result')
    if (cached) {
      try {
        const data: unknown = JSON.parse(cached)
        if (isGenerateAdResponse(data)) {
          window.setTimeout(() => {
            setResult(data)
            if (!data.libtv?.attempted) startLibtvGeneration(data)
            else startPolling(data.sessionId ?? '', data.sessionIdB, data.libtv.projectUuidA, data.libtv.projectUuidB)
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
      .then(readGenerateAdResponse)
      .then(data => {
        setAnalysisError('')
        setResult(data)
        sessionStorage.setItem('addrama_ad_result', JSON.stringify(data))
        startLibtvGeneration(data)
      })
      .catch(err => {
        const message = (err as Error).message || 'AI 分析失败：未知错误'
        setAnalysisError(message)
        sessionStorage.setItem('addrama_ad_result', JSON.stringify({ error: message }))
      })
      .finally(() => setIsAnalyzing(false))

    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [router, startPolling, startLibtvGeneration])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateMetadata = () => setVideoDuration(Number.isFinite(video.duration) ? video.duration : 0)
    const handler = () => {
      setCurrentSec(video.currentTime)
      updateMetadata()

      const insertPoint = chooseInsertPoint(result?.rhythmTimeline?.recommendedInsertPoints, video.duration)
      const avoidPoint = Math.max(1, insertPoint - 6)
      setShowAvoidBanner(video.currentTime >= avoidPoint && video.currentTime < avoidPoint + 2)

      if (shouldTriggerNonSkippableAd({
        currentTime: video.currentTime,
        insertPoint,
        alreadyTriggered: adTriggeredRef.current,
      })) {
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

    video.addEventListener('loadedmetadata', updateMetadata)
    video.addEventListener('timeupdate', handler)
    video.addEventListener('ended', ended)
    return () => {
      video.removeEventListener('loadedmetadata', updateMetadata)
      video.removeEventListener('timeupdate', handler)
      video.removeEventListener('ended', ended)
    }
  }, [result, videoUrl])

  function handleSeek(value: string) {
    const next = Number(value)
    const video = videoRef.current
    if (!video || !Number.isFinite(next)) return
    video.currentTime = next
    setCurrentSec(next)
  }

  function handleAdInteract() {
    setShowPreference(true)
  }

  function resumeVideo() {
    setShowAdCard(false)
    if (sourceVideoUrl && videoUrl !== sourceVideoUrl) setVideoUrl(sourceVideoUrl)
    window.setTimeout(() => {
      const video = videoRef.current
      if (video && !video.ended) void video.play().catch(() => undefined)
    }, 0)
  }

  const durationSec = Math.max(60, (result?.rhythmTimeline?.segments?.at(-1)?.endSec ?? videoDuration) || 240)
  const insertPoint = chooseInsertPoint(result?.rhythmTimeline?.recommendedInsertPoints, videoDuration)

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

      <div className="relative rounded-xl overflow-hidden mb-3" style={{ background: '#000', aspectRatio: '16/9' }}>
        {videoUrl && (
          <video
            key={videoUrl}
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            autoPlay
            controls
          />
        )}

        {adVideoUrl && (
          <div
            className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: 'var(--teal)', color: '#000' }}
          >
            Libtv 广告视频已生成，可在下方广告卡中预览
          </div>
        )}

        {!adVideoUrl && isPolling && (
          <div
            className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-lg text-xs"
            style={{ background: 'rgba(0,0,0,0.72)', border: '1px solid var(--teal)', color: 'var(--teal)' }}
          >
            Libtv/Seedance 正在生成广告视频；生成后会进入广告卡，不会覆盖原上传视频。
          </div>
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

      <div className="mb-4 rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{formatMediaTime(currentSec)}</span>
          <input
            type="range"
            min="0"
            max={Math.max(1, videoDuration)}
            value={Math.min(currentSec, Math.max(1, videoDuration))}
            step="0.1"
            onChange={event => handleSeek(event.target.value)}
            className="flex-1 accent-[var(--teal)]"
            aria-label="视频进度条"
          />
          <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{formatMediaTime(videoDuration)}</span>
        </div>
        <p className="text-[10px] mt-2" style={{ color: 'var(--gold)' }}>
          推荐广告插入点：{formatMediaTime(insertPoint)}。评委可拖动进度条快速定位，达到插入点后会触发不可跳过广告门禁。{adVideoUrl ? ' Libtv 生成视频已作为广告素材准备好，原片仍保留播放。' : ''}
        </p>
      </div>

      {result?.selectedAdvertiser && (
        <div className="mb-4 rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--gold)' }}>
          <p className="text-[9px] font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>AI 匹配广告素材</p>
          <p className="font-bold text-sm" style={{ color: 'var(--gold)' }}>
            {result.selectedAdvertiser.industry} · {result.selectedAdvertiser.brandName} · {result.selectedAdvertiser.productName}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{result.selectedAdvertiser.matchReason}</p>
          {result.libtv && (
            <div className="text-[10px] mt-2 space-y-1" style={{ color: result.libtv.status === 'error' ? 'var(--red)' : 'var(--teal)' }}>
              <p>Libtv: {pollingMessage || (result.libtv.status === 'queued' ? '已创建生成任务，正在异步渲染' : result.libtv.error)}</p>
              <div className="flex gap-3">
                {result.libtv.projectUrlA && <a href={result.libtv.projectUrlA} target="_blank" className="underline">打开 A 版项目画布</a>}
                {result.libtv.projectUrlB && <a href={result.libtv.projectUrlB} target="_blank" className="underline">打开 B 版项目画布</a>}
              </div>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="mb-4 rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <RhythmTimeline timeline={result.rhythmTimeline} durationSec={durationSec} currentSec={Math.floor(currentSec)} />
        </div>
      )}


      <AnimatePresence>
        {showAdCard && result && (
          <div className="mb-4">
            <AdCard
              adCopy={result.adCopyA}
              interactiveQuestion={result.interactiveQuestion}
              selectedAdvertiser={result.selectedAdvertiser}
              adVideoUrl={adVideoUrl}
              isLoading={isPolling && !adVideoUrl}
              onInteract={handleAdInteract}
              onComplete={resumeVideo}
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


