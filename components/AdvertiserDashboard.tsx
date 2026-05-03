const METRICS = [
  { value: '2.4M', label: '曝光量', delta: undefined, color: 'var(--text)' },
  { value: '87%', label: '完播率', delta: '↑ 34% vs 传统贴片', positive: true },
  { value: '48%', label: '互动率', delta: '行业均值 3.2%', positive: true },
  { value: '2.1%', label: '负反馈率', delta: '↓ 61% vs 传统贴片', positive: true, color: 'var(--green)' },
  { value: '73%', label: '品牌记忆度', delta: '↑ 35%', positive: true },
  { value: '94%', label: '内容场景匹配度', delta: undefined, color: 'var(--teal)' },
]

const SCENE_DATA = [
  { scene: '美食/火锅场景', rate: 9.5, width: 95 },
  { scene: '战后休息（本视频）', rate: 8.2, width: 82 },
  { scene: '运动/健身场景', rate: 7.4, width: 74 },
  { scene: '悬疑转场', rate: 6.1, width: 61 },
]

const AB_DATA = [
  {
    label: 'A',
    color: 'var(--teal)',
    copy: '「激战之后，来一口 0 糖气泡水，清爽如破境之感。」',
    completion: '91%',
    ctr: '9.2%',
  },
  {
    label: 'B',
    color: 'var(--gold)',
    copy: '「修炼间隙，0 脂气泡水——这一口，值了。」',
    completion: '83%',
    ctr: '7.6%',
  },
]

export default function AdvertiserDashboard() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="flex justify-between items-center px-4 py-3"
          style={{ background: '#080810', borderBottom: '1px solid var(--border)' }}>
          <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>某气泡水品牌 · AdDrama 广告效果</span>
          <span className="text-[10px] font-mono-syne" style={{ color: 'var(--muted)' }}>2026-04-01 → 2026-04-30</span>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-3 gap-px" style={{ background: 'var(--border)' }}>
          {METRICS.map(m => (
            <div key={m.label} style={{ background: 'var(--surface)' }} className="p-4 text-center">
              <p className="font-display text-3xl mb-1" style={{ color: m.color ?? 'var(--gold)', lineHeight: 1 }}>{m.value}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{m.label}</p>
              {m.delta && <p className="text-[10px] mt-1 font-mono-syne" style={{ color: 'var(--green)' }}>{m.delta}</p>}
            </div>
          ))}
        </div>

        {/* Scene conversion */}
        <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-[9px] font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--muted)' }}>不同场景转化率</p>
          {SCENE_DATA.map(row => (
            <div key={row.scene} className="flex items-center gap-3 mb-2">
              <span className="text-xs flex-1" style={{ color: 'var(--text)' }}>{row.scene}</span>
              <div className="flex-1 h-1 rounded-full" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full" style={{ width: `${row.width}%`, background: 'var(--teal)' }} />
              </div>
              <span className="text-[10px] font-mono-syne w-10 text-right" style={{ color: 'var(--teal)' }}>{row.rate}%</span>
            </div>
          ))}
        </div>

        {/* A/B results */}
        <div className="grid grid-cols-2 gap-3 p-4" style={{ borderTop: '1px solid var(--border)' }}>
          {AB_DATA.map(ab => (
            <div key={ab.label} className="rounded-lg p-3" style={{ background: '#080810' }}>
              <p className="text-[9px] font-bold font-mono-syne mb-2" style={{ color: ab.color }}>
                A/B 测试 · 版本 {ab.label}
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--text)', lineHeight: 1.5 }}>{ab.copy}</p>
              <div className="flex gap-4">
                <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                  完播率 <span className="font-bold" style={{ color: ab.color }}>{ab.completion}</span>
                </span>
                <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                  点击率 <span className="font-bold" style={{ color: ab.color }}>{ab.ctr}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
