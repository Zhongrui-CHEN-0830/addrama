'use client'

import { useState } from 'react'
import type { RhythmTimeline as RhythmTimelineType } from '@/types'

interface RhythmTimelineProps {
  timeline: RhythmTimelineType
  durationSec: number
  currentSec: number
}

const RISK_COLORS = {
  red: '#ff3b3b',
  yellow: '#eab308',
  green: '#22c55e',
}

const RISK_LABELS = {
  red: '不适合插广告',
  yellow: '谨慎插广告',
  green: '适合插广告',
}

export default function RhythmTimeline({ timeline, durationSec, currentSec }: RhythmTimelineProps) {
  const [tooltip, setTooltip] = useState<{ x: number; segment: (typeof timeline.segments)[0] } | null>(null)

  return (
    <div className="w-full px-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
          AI 剧情节奏分析 · 广告插入建议
        </span>
      </div>

      {/* Track */}
      <div className="relative h-2 rounded-full w-full" style={{ background: 'var(--border)' }}>
        {/* Colored segments */}
        {timeline.segments.map((seg, i) => {
          const left = (seg.startSec / durationSec) * 100
          const width = ((seg.endSec - seg.startSec) / durationSec) * 100
          return (
            <div
              key={i}
              className="absolute h-full rounded-full cursor-pointer transition-opacity hover:opacity-80"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: RISK_COLORS[seg.risk],
              }}
              onMouseEnter={e => {
                const rect = (e.target as HTMLElement).getBoundingClientRect()
                const parentRect = (e.target as HTMLElement).parentElement!.getBoundingClientRect()
                setTooltip({ x: rect.left - parentRect.left + rect.width / 2, segment: seg })
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          )
        })}

        {/* Recommended insert points ▼ */}
        {timeline.recommendedInsertPoints.map((sec, i) => (
          <div
            key={i}
            className="absolute -top-3 text-[10px]"
            style={{ left: `${(sec / durationSec) * 100}%`, transform: 'translateX(-50%)', color: '#22c55e' }}
          >
            ▼
          </div>
        ))}

        {/* Playhead */}
        <div
          className="absolute -top-1 w-0.5 h-4 rounded-full"
          style={{
            left: `${(currentSec / durationSec) * 100}%`,
            background: '#fff',
            boxShadow: '0 0 6px rgba(255,255,255,0.6)',
            transition: 'left 0.5s linear',
          }}
        />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute -top-10 px-2 py-1 rounded text-[10px] whitespace-nowrap z-10 pointer-events-none"
            style={{
              left: tooltip.x,
              transform: 'translateX(-50%)',
              background: 'var(--surface)',
              border: `1px solid ${RISK_COLORS[tooltip.segment.risk]}`,
              color: RISK_COLORS[tooltip.segment.risk],
            }}
          >
            {tooltip.segment.reason} · 情绪 {tooltip.segment.emotionScore}
          </div>
        )}
      </div>

      {/* Time markers */}
      <div className="flex justify-between mt-1">
        {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <span key={p} className="font-mono-syne text-[8px]" style={{ color: 'var(--muted)' }}>
            {Math.round(p * durationSec)}s
          </span>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-2">
        {(['red', 'yellow', 'green'] as const).map(r => (
          <div key={r} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: RISK_COLORS[r] }} />
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{RISK_LABELS[r]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
