'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  canDismissNonSkippableAd,
  getAdGateRemainingSeconds,
  NON_SKIPPABLE_AD_SECONDS,
} from '@/lib/media-gate'
import { getAdvertiserLibraryWithSelection } from '@/lib/ad-library'
import type { SelectedAdvertiser } from '@/types'

interface AdCardProps {
  adCopy: string
  interactiveQuestion: string
  selectedAdvertiser?: SelectedAdvertiser
  adVideoUrl?: string
  isLoading?: boolean
  onInteract: (choice: 'interact' | 'watch' | 'later') => void
  onComplete?: () => void
}

export default function AdCard({ adCopy, interactiveQuestion, selectedAdvertiser, adVideoUrl, isLoading, onInteract, onComplete }: AdCardProps) {
  const [startedAtMs] = useState(() => Date.now())
  const [nowMs, setNowMs] = useState(() => Date.now())
  const remaining = getAdGateRemainingSeconds(startedAtMs, nowMs)
  const canDismiss = canDismissNonSkippableAd(startedAtMs, nowMs)
  const advertiserLibrary = getAdvertiserLibraryWithSelection(selectedAdvertiser)

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
      <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--teal)', color: '#000' }}>
            ✦ AI 已避开关键剧情点
          </span>
          <span className="text-[10px] font-bold px-3 py-1 rounded-full"
            style={{ background: canDismiss ? 'var(--teal)' : 'var(--red)', color: canDismiss ? '#000' : '#fff' }}>
            {canDismiss ? '可继续观看' : `不可跳过 ${remaining}s`}
          </span>
        </div>

        <p className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>{adCopy}</p>
        <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{interactiveQuestion}</p>
        <p className="text-[10px] font-mono-syne" style={{ color: 'var(--gold)' }}>
          {isLoading
            ? 'Libtv/Seedance 视频仍在异步生成；当前广告卡展示广告库与 AI 选择理由。'
            : adVideoUrl
              ? `Libtv 已生成视频广告；至少观看 ${NON_SKIPPABLE_AD_SECONDS} 秒后可继续原片。`
              : `该广告至少观看 ${NON_SKIPPABLE_AD_SECONDS} 秒后可继续。`}
        </p>
      </div>

      <div className="p-4">
        {adVideoUrl && (
          <div className="mb-4 rounded-lg overflow-hidden" style={{ border: '1px solid var(--teal)', background: '#000' }}>
            <video src={adVideoUrl} className="w-full max-h-[360px] object-contain" autoPlay controls playsInline />
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>AD LIBRARY</p>
            <h3 className="font-bold text-sm" style={{ color: 'var(--teal)' }}>广告库 · AI 实时匹配</h3>
          </div>
          {selectedAdvertiser && (
            <div className="text-right">
              <p className="text-[10px]" style={{ color: 'var(--muted)' }}>当前选中</p>
              <p className="text-xs font-bold" style={{ color: 'var(--gold)' }}>
                {selectedAdvertiser.industry} · {selectedAdvertiser.brandName}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          {advertiserLibrary.map(asset => (
            <div
              key={asset.id}
              className="rounded-lg p-3"
              style={{
                background: asset.selected ? 'var(--teal-dim)' : 'rgba(255,255,255,0.03)',
                border: asset.selected ? '1px solid var(--teal)' : '1px solid var(--border)',
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <p className="text-[10px]" style={{ color: asset.selected ? 'var(--teal)' : 'var(--muted)' }}>{asset.industry}</p>
                  <p className="font-bold text-xs" style={{ color: 'var(--text)' }}>{asset.brandName} · {asset.productName}</p>
                </div>
                {asset.selected && <span className="text-[10px] font-bold" style={{ color: 'var(--teal)' }}>AI 选中</span>}
              </div>
              <p className="text-[10px] line-clamp-2" style={{ color: 'var(--muted)' }}>{asset.keySellingPoint}</p>
              {asset.selected && asset.matchReason && (
                <p className="text-[10px] mt-2" style={{ color: 'var(--gold)' }}>选择理由：{asset.matchReason}</p>
              )}
            </div>
          ))}
        </div>

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
