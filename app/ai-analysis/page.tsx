'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import AiPanel from '@/components/AiPanel'
import AdFormatSelector from '@/components/AdFormatSelector'
import RhythmTimeline from '@/components/RhythmTimeline'
import { parseCachedAdResult, readGenerateAdJobStatusResponse, startGenerateAdJobPolling } from '@/lib/ad-result'
import type { GenerateAdResponse } from '@/types'

export default function AiAnalysisPage() {
  const router = useRouter()
  const [result, setResult] = useState<GenerateAdResponse | null>(null)
  const [analysisError, setAnalysisError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    function applyCachedResult(raw: string | null) {
      const state = parseCachedAdResult(raw)
      if (state.status === 'pending') return false
      if (state.status === 'ready') {
        setResult(state.result)
        setAnalysisError('')
      } else {
        setResult(null)
        setAnalysisError(state.error)
      }
      setIsLoading(false)
      return true
    }

    async function pollJob(jobId: string) {
      try {
        const response = await fetch(`/api/generate-ad/${jobId}`)
        const state = await readGenerateAdJobStatusResponse(response)
        if (state.status === 'pending') return false
        if (state.status === 'done') {
          sessionStorage.setItem('addrama_ad_result', JSON.stringify(state.result))
          setResult(state.result)
          setAnalysisError('')
        } else {
          sessionStorage.setItem('addrama_ad_result', JSON.stringify({ error: state.error }))
          setResult(null)
          setAnalysisError(state.error)
        }
        setIsLoading(false)
        return true
      } catch (err) {
        const message = (err as Error).message || 'AI 分析状态查询失败'
        sessionStorage.setItem('addrama_ad_result', JSON.stringify({ error: message }))
        setResult(null)
        setAnalysisError(message)
        setIsLoading(false)
        return true
      }
    }

    if (applyCachedResult(sessionStorage.getItem('addrama_ad_result'))) return

    const jobState = startGenerateAdJobPolling(sessionStorage.getItem('addrama_ad_job'))
    if (jobState.status === 'missing') {
      window.setTimeout(() => {
        setAnalysisError('AI 分析尚未开始：请回到改造前页面重新触发分析。')
        setIsLoading(false)
      }, 0)
      return
    }
    if (jobState.status === 'error') {
      window.setTimeout(() => {
        setAnalysisError(jobState.error)
        setIsLoading(false)
      }, 0)
      return
    }

    void pollJob(jobState.jobId).then(done => {
      if (done) return
    })

    const startedAt = Date.now()
    const interval = setInterval(() => {
      void pollJob(jobState.jobId).then(done => {
        if (done) {
          clearInterval(interval)
          return
        }
        if (Date.now() - startedAt > 120_000) {
          setAnalysisError('AI 分析超时：后台 job 还没有返回 Kimi 结果。请回到改造前页面重新触发分析，或检查 /api/generate-ad/[jobId] 服务端日志。')
          setIsLoading(false)
          clearInterval(interval)
        }
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [])

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
