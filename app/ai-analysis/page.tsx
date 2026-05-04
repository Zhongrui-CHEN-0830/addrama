'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import AiPanel from '@/components/AiPanel'
import AdFormatSelector from '@/components/AdFormatSelector'
import RhythmTimeline from '@/components/RhythmTimeline'
import { parseCachedAdResult, readGenerateAdJobCreateResponse, readGenerateAdJobStatusResponse, startGenerateAdJobPolling } from '@/lib/ad-result'
import type { GenerateAdResponse } from '@/types'

export default function AiAnalysisPage() {
  const router = useRouter()
  const [result, setResult] = useState<GenerateAdResponse | null>(null)
  const [analysisError, setAnalysisError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const blobUrl = sessionStorage.getItem('addrama_blob_url')
    if (!blobUrl) { router.push('/'); return }

    function safeSetLoading(next: boolean) {
      if (!cancelled) setIsLoading(next)
    }

    function safeSetResult(next: GenerateAdResponse | null) {
      if (!cancelled) setResult(next)
    }

    function safeSetAnalysisError(next: string) {
      if (!cancelled) setAnalysisError(next)
    }

    async function createReplacementJob(reason: string) {
      safeSetLoading(true)
      safeSetAnalysisError(reason)
      sessionStorage.removeItem('addrama_ad_job')
      sessionStorage.removeItem('addrama_ad_result')

      const frames = JSON.parse(sessionStorage.getItem('addrama_video_frames') ?? '[]')
      const userPreferences = sessionStorage.getItem('addrama_user_ad_preferences')
      const response = await fetch('/api/generate-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blobUrl, frames, userPreferences }),
      })
      const job = await readGenerateAdJobCreateResponse(response)
      sessionStorage.setItem('addrama_ad_job', JSON.stringify(job))
      return job.jobId
    }

    function applyCachedResult(raw: string | null) {
      const state = parseCachedAdResult(raw)
      if (state.status === 'pending') return false
      if (state.status === 'ready') {
        safeSetResult(state.result)
        safeSetAnalysisError('')
      } else {
        safeSetResult(null)
        safeSetAnalysisError(state.error)
      }
      safeSetLoading(false)
      return true
    }

    async function pollJob(jobId: string): Promise<{ done: true } | { done: false; jobId: string }> {
      try {
        const response = await fetch(`/api/generate-ad/${jobId}`)
        const state = await readGenerateAdJobStatusResponse(response)
        if (state.status === 'pending') return { done: false, jobId }
        if (state.status === 'done') {
          sessionStorage.setItem('addrama_ad_result', JSON.stringify(state.result))
          safeSetResult(state.result)
          safeSetAnalysisError('')
        } else {
          sessionStorage.setItem('addrama_ad_result', JSON.stringify({ error: state.error }))
          safeSetResult(null)
          safeSetAnalysisError(state.error)
        }
        safeSetLoading(false)
        return { done: true }
      } catch (err) {
        const message = (err as Error).message || 'AI 分析状态查询失败'
        if (message === 'STALE_GENERATE_AD_JOB') {
          const replacementJobId = await createReplacementJob('检测到旧的 AI 分析 job 已失效，正在自动重新分析…')
          return { done: false, jobId: replacementJobId }
        }
        sessionStorage.setItem('addrama_ad_result', JSON.stringify({ error: message }))
        safeSetResult(null)
        safeSetAnalysisError(message)
        safeSetLoading(false)
        return { done: true }
      }
    }

    if (applyCachedResult(sessionStorage.getItem('addrama_ad_result'))) return

    let activeJobId = ''
    const startedAt = Date.now()
    const interval = setInterval(() => {
      if (!activeJobId) return
      void pollJob(activeJobId).then(state => {
        if (state.done) {
          clearInterval(interval)
          return
        }
        activeJobId = state.jobId
        if (Date.now() - startedAt > 120_000) {
          safeSetAnalysisError('AI 分析超时：后台 job 还没有返回 Kimi 结果。请回到改造前页面重新触发分析，或检查 /api/generate-ad/[jobId] 服务端日志。')
          safeSetLoading(false)
          clearInterval(interval)
        }
      })
    }, 2000)

    const jobState = startGenerateAdJobPolling(sessionStorage.getItem('addrama_ad_job'))
    if (jobState.status === 'missing') {
      void createReplacementJob('AI 分析尚未开始：正在自动启动分析…')
        .then(jobId => {
          activeJobId = jobId
          return pollJob(activeJobId)
        })
        .then(state => {
          if (!state.done) activeJobId = state.jobId
        })
        .catch(err => {
          safeSetAnalysisError((err as Error).message || 'AI 分析启动失败：未知错误')
          safeSetLoading(false)
          clearInterval(interval)
        })
    } else if (jobState.status === 'error') {
      window.setTimeout(() => {
        safeSetAnalysisError(jobState.error)
        safeSetLoading(false)
        clearInterval(interval)
      }, 0)
    } else {
      activeJobId = jobState.jobId
      void pollJob(activeJobId).then(state => {
        if (!state.done) activeJobId = state.jobId
      })
    }

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [router])

  const MOCK_DURATION = 240 // 4 minutes default

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
        <p className="text-xs font-mono-syne tracking-widest mb-1" style={{ color: 'var(--purple)' }}>
          KIMI K2.6 · 视频场景理解
        </p>
        <h2 className="font-display text-3xl mb-1" style={{ color: 'var(--text)' }}>AI 决策面板</h2>
        <p className="text-sm" style={{ color: analysisError ? 'var(--red)' : 'var(--muted)' }}>
          {analysisError || '透明展示 AI 如何理解剧情，决定广告时机与形式'}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6">
        {/* Rhythm timeline */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-[9px] font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--muted)' }}>
              剧情节奏识别
            </p>
            <RhythmTimeline
              timeline={result.rhythmTimeline}
              durationSec={MOCK_DURATION}
              currentSec={35}
            />
          </motion.div>
        )}

        {/* Scene analysis + AI panel */}
        <AiPanel
          sceneAnalysis={result?.sceneAnalysis ?? {
            sceneType: '', emotionScore: 0, tags: [],
            advertisingRisk: 'high', recommendedAdType: '', reasoning: '',
          }}
          adFormat={result?.adFormat ?? 'buffer-card'}
          adFormatReason={result?.adFormatReason ?? ''}
          isLoading={isLoading}
        />

        {/* Ad format selector */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-[9px] font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--muted)' }}>
              广告形式选择
            </p>
            <AdFormatSelector selected={result.adFormat} reason={result.adFormatReason} />
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-2">
          <button
            onClick={() => router.push('/before')}
            className="px-5 py-2.5 rounded-xl text-sm transition-all hover:opacity-80"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
          >
            ← 回到改造前
          </button>
          <button
            onClick={() => router.push('/after')}
            className="px-8 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-80"
            style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal)', color: 'var(--teal)' }}
          >
            体验改造后 →
          </button>
        </div>
      </div>
    </main>
  )
}
