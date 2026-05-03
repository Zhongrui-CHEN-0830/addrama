'use client'

import { motion } from 'framer-motion'

interface AdCardProps {
  adCopy: string
  interactiveQuestion: string
  videoUrl?: string
  isLoading?: boolean
  onInteract: (choice: 'interact' | 'watch' | 'later') => void
}

export default function AdCard({ adCopy, interactiveQuestion, videoUrl, isLoading, onInteract }: AdCardProps) {
  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--teal)', background: 'linear-gradient(135deg, #060e0a, #0a1a12)' }}
    >
      {/* Ad video */}
      <div className="relative" style={{ aspectRatio: '16/9', background: '#000' }}>
        {videoUrl ? (
          <video src={videoUrl} autoPlay muted loop className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 rounded-full border-2 border-t-transparent"
                  style={{ borderColor: 'var(--teal)', borderTopColor: 'transparent' }}
                />
                <p className="text-sm font-mono-syne" style={{ color: 'var(--teal)' }}>
                  Seedance 2.0 正在渲染广告…
                </p>
              </>
            ) : (
              <div className="text-4xl opacity-30">🎬</div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--teal)', color: '#000' }}>
            ✦ AI 已避开关键剧情点
          </span>
          <span className="text-[10px] font-mono-syne" style={{ color: 'var(--muted)' }}>仅需 8 秒</span>
        </div>

        <p className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>{adCopy}</p>
        <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{interactiveQuestion}</p>
        <p className="text-[10px] font-mono-syne mb-4" style={{ color: 'var(--gold)' }}>
          Kimi 已根据当前剧情选择广告素材与形式；Libtv/Seedance 负责异步渲染广告视频
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => onInteract('interact')}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
            style={{ background: 'var(--teal)', color: '#000' }}>
            参与 1 个问题，跳过后续广告 →
          </button>
          <button
            onClick={() => onInteract('watch')}
            className="px-3 py-2 rounded-lg text-xs transition-opacity hover:opacity-80"
            style={{ background: 'var(--border)', color: 'var(--muted)' }}>
            15s 广告
          </button>
          <button
            onClick={() => onInteract('later')}
            className="px-3 py-2 rounded-lg text-xs transition-opacity hover:opacity-80"
            style={{ background: 'var(--border)', color: 'var(--muted)' }}>
            稍后
          </button>
        </div>
      </div>
    </motion.div>
  )
}
