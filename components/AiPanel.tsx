'use client'

import { motion } from 'framer-motion'
import type { SceneAnalysis, AdFormat } from '@/types'

interface AiPanelProps {
  sceneAnalysis: SceneAnalysis
  adFormat: AdFormat
  adFormatReason: string
  isLoading?: boolean
}

const RISK_CONFIG = {
  high: { label: '高风险', color: 'var(--red)' },
  medium: { label: '中等风险', color: 'var(--yellow)' },
  low: { label: '低风险', color: 'var(--green)' },
}

export default function AiPanel({ sceneAnalysis, adFormat: _adFormat, adFormatReason, isLoading }: AiPanelProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl p-6 flex flex-col items-center gap-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <motion.div
          animate={{ scaleX: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-48 h-0.5 rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, var(--teal), transparent)' }}
        />
        <p className="text-sm font-mono-syne" style={{ color: 'var(--teal)' }}>
          Kimi k2.6 正在分析视频内容…
        </p>
        <motion.div
          animate={{ scaleX: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
          className="w-32 h-0.5 rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, var(--purple), transparent)' }}
        />
      </div>
    )
  }

  const risk = RISK_CONFIG[sceneAnalysis.advertisingRisk]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Scene type + emotion */}
      <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[9px] font-bold tracking-widest uppercase mb-1" style={{ color: 'var(--muted)' }}>场景识别</p>
            <p className="font-bold" style={{ color: 'var(--text)' }}>{sceneAnalysis.sceneType}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold tracking-widest uppercase mb-1" style={{ color: 'var(--muted)' }}>情绪强度</p>
            <p className="font-display text-3xl" style={{ color: risk.color, lineHeight: 1 }}>
              {sceneAnalysis.emotionScore}
            </p>
          </div>
        </div>

        {/* Emotion bar */}
        <div className="h-1.5 rounded-full mb-2" style={{ background: 'var(--border)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${sceneAnalysis.emotionScore}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: risk.color }}
          />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {sceneAnalysis.tags.map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: 'var(--purple-dim)', border: '1px solid var(--purple)', color: 'var(--purple)' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Ad risk + decision */}
      <div className="rounded-xl p-4" style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>广告插入风险</span>
          <span className="text-sm font-bold" style={{ color: risk.color }}>{risk.label}</span>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>{sceneAnalysis.reasoning}</p>
        <div className="flex items-start gap-2">
          <span className="text-xs font-bold" style={{ color: 'var(--teal)' }}>推荐广告形式：</span>
          <span className="text-xs" style={{ color: 'var(--text)' }}>{sceneAnalysis.recommendedAdType}</span>
        </div>
        <div className="flex items-start gap-2 mt-1">
          <span className="text-xs font-bold" style={{ color: 'var(--teal)' }}>选择理由：</span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>{adFormatReason}</span>
        </div>
      </div>
    </motion.div>
  )
}
