import type { AdFormat } from '@/types'

const FORMAT_META: Record<AdFormat, { icon: string; name: string; scene: string; duration: string }> = {
  short: { icon: '📋', name: '普通短广告', scene: '低情绪强度', duration: '15–30s' },
  'buffer-card': { icon: '🎭', name: '剧情缓冲卡', scene: '转场/章节间隔', duration: '3–8s' },
  'character-match': { icon: '👗', name: '角色同款推荐', scene: '可消费场景', duration: '6–10s' },
  interactive: { icon: '🎮', name: '互动选择广告', scene: '广告敏感用户', duration: '8s+互动' },
  'drama-style': { icon: '🎬', name: 'AI 短剧式广告', scene: '高预算品牌', duration: '15s' },
  'end-card': { icon: '🌙', name: '低打扰片尾广告', scene: '连续追剧', duration: '片尾' },
}

interface AdFormatSelectorProps {
  selected: AdFormat
  reason: string
}

export default function AdFormatSelector({ selected, reason }: AdFormatSelectorProps) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        {(Object.entries(FORMAT_META) as [AdFormat, typeof FORMAT_META[AdFormat]][]).map(([fmt, meta]) => (
          <div
            key={fmt}
            className="rounded-lg p-3 border transition-all"
            style={{
              borderColor: fmt === selected ? 'var(--teal)' : 'var(--border)',
              background: fmt === selected ? 'var(--teal-dim)' : 'var(--surface)',
            }}
          >
            <div className="text-xl mb-1">{meta.icon}</div>
            <div className="font-bold text-xs mb-0.5"
              style={{ color: fmt === selected ? 'var(--teal)' : 'var(--text)' }}>
              {meta.name}
              {fmt === selected && <span className="ml-1 text-[9px]">← AI 推荐</span>}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--muted)' }}>{meta.scene}</div>
            <div className="text-[9px] font-mono-syne mt-1" style={{ color: 'var(--muted)' }}>{meta.duration}</div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-lg px-3 py-2"
        style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal)' }}>
        <span className="text-xs font-bold" style={{ color: 'var(--teal)' }}>✦ AI 决策理由：</span>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>{reason}</span>
      </div>
    </div>
  )
}
