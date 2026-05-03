'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  canDismissNonSkippableAd,
  getAdGateRemainingSeconds,
  NON_SKIPPABLE_AD_SECONDS,
} from '@/lib/media-gate'

interface AdCardProps {
  adCopy: string
  interactiveQuestion: string
  videoUrl?: string
  isLoading?: boolean
  onInteract: (choice: 'interact' | 'watch' | 'later') => void
  onComplete?: () => void
}

export default function AdCard({ adCopy, interactiveQuestion, videoUrl, isLoading, onInteract, onComplete }: AdCardProps) {
  const [startedAtMs] = useState(() => Date.now())
  const [nowMs, setNowMs] = useState(() => Date.now())
  const remaining = getAdGateRemainingSeconds(startedAtMs, nowMs)
  const canDismiss = canDismissNonSkippableAd(startedAtMs, nowMs)

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  function complete(choice: 'interact' | 'watch' | 'later') {
    if (!canDismiss) return
    onInteract(choice)
    onComplete?.()
  }

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--teal)', background: 'linear-gradient(135deg, #060e0a, #0a1a12)' }}
    >
      <div className="relative" style={{ aspectRatio: '16/9', background: '#000' }}>
        {videoUrl ? (
          <video src={videoUrl} autoPlay controls className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 rounded-full border-2 border-t-transparent"
                  style={{ borderColor: 'var(--teal)', borderTopColor: 'transparent' }}
                />
                <p className="text-sm font-mono-syne" style={{ color: 'var(--teal)' }}>
                  Libtv/Seedance 正在异步渲染广告，通常需要数分钟…
                </p>
                <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
                  生成完成后将自动替换为可播放广告视频；当前先展示 AI 生成的广告卡片。
                </p>
              </>
            ) : (
              <div className="text-4xl opacity-30">🎬</div>
            )}
          </div>
        )}
        <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: canDismiss ? 'var(--teal)' : 'var(--red)', color: canDismiss ? '#000' : '#fff' }}>
          {canDismiss ? '可继续观看' : `不可跳过 ${remaining}s`}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--teal)', color: '#000' }}>
            ✦ AI 已避开关键剧情点
          </span>
          <span className="text-[10px] font-mono-syne" style={{ color: 'var(--muted)' }}>
            {canDismiss ? '已满足展示时长' : `至少观看 ${NON_SKIPPABLE_AD_SECONDS} 秒`}
          </span>
        </div>

        <p className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>{adCopy}</p>
        <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{interactiveQuestion}</p>
        <p className="text-[10px] font-mono-syne mb-4" style={{ color: 'var(--gold)' }}>
          Kimi 已根据当前剧情选择广告素材与形式；Libtv/Seedance 负责异步渲染广告视频
        </p>

        <div className="flex gap-2">
          <button
            disabled={!canDismiss}
            onClick={() => complete('interact')}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--teal)', color: '#000' }}>
            参与 1 个问题，继续观看 →
          </button>
          <button
            disabled={!canDismiss}
            onClick={() => complete('watch')}
            className="px-3 py-2 rounded-lg text-xs transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--border)', color: 'var(--muted)' }}>
            看完继续
          </button>
          <button
            disabled={!canDismiss}
            onClick={() => complete('later')}
            className="px-3 py-2 rounded-lg text-xs transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--border)', color: 'var(--muted)' }}>
            稍后反馈
          </button>
        </div>
      </div>
    </motion.div>
  )
}
