'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import AdvertiserDashboard from '@/components/AdvertiserDashboard'

const USER_BENEFITS = [
  '广告不再打断剧情高潮',
  '广告更短、更相关',
  '可互动换取跳过权益',
  '对无关广告有反馈权',
]

const PLATFORM_BENEFITS = [
  { label: '广告完播率', value: '↑34%' },
  { label: '广告负反馈', value: '↓61%' },
  { label: '观看时长', value: '↑24%' },
]

const ADVERTISER_BENEFITS = [
  { value: '↑48%', label: '互动率', delta: '行业均值 3.2%' },
  { value: '↑35%', label: '品牌记忆度', delta: 'vs 传统贴片' },
  { value: '↑2.3×', label: '场景匹配转化', delta: '精准触达' },
]

export default function ValuePage() {
  const router = useRouter()

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 text-center">
        <p className="text-xs font-mono-syne tracking-widest mb-2" style={{ color: 'var(--gold)' }}>
          ADDRAMA AI · 三方价值
        </p>
        <h2 className="font-display text-4xl mb-2" style={{ color: 'var(--gold)', lineHeight: 1 }}>
          三赢，才是真正的解法
        </h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          AI 广告不是妥协——它让用户、平台、广告主同时获益
        </p>
      </motion.div>

      {/* Three party cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {/* User */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--teal)' }}
        >
          <div className="text-3xl mb-3">👤</div>
          <h3 className="font-bold mb-3" style={{ color: 'var(--teal)' }}>用户</h3>
          <ul className="space-y-2">
            {USER_BENEFITS.map(b => (
              <li key={b} className="text-xs flex items-start gap-2" style={{ color: 'var(--muted)' }}>
                <span style={{ color: 'var(--teal)' }}>✓</span>{b}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Platform */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
          className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--purple)' }}
        >
          <div className="text-3xl mb-3">📺</div>
          <h3 className="font-bold mb-3" style={{ color: 'var(--purple)' }}>平台</h3>
          <div className="space-y-3">
            {PLATFORM_BENEFITS.map(b => (
              <div key={b.label}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{b.label}</span>
                  <span className="font-display text-lg" style={{ color: 'var(--green)', lineHeight: 1 }}>{b.value}</span>
                </div>
                <div className="h-0.5 rounded-full" style={{ background: 'var(--border)' }} />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Advertiser */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
          className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--gold)' }}
        >
          <div className="text-3xl mb-3">📢</div>
          <h3 className="font-bold mb-3" style={{ color: 'var(--gold)' }}>广告主</h3>
          <div className="space-y-2">
            {ADVERTISER_BENEFITS.map(b => (
              <div key={b.label} className="flex justify-between items-center">
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{b.label}</span>
                <span className="font-display text-xl" style={{ color: 'var(--gold)', lineHeight: 1 }}>{b.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Product doc */}
      <motion.div
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="mb-8 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold)' }}
      >
        <div>
          <h3 className="font-bold mb-1" style={{ color: 'var(--gold)' }}>产品说明文档</h3>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            支持现场编辑保存，方便评委快速理解产品逻辑、demo 范围和商业价值。
          </p>
        </div>
        <button
          onClick={() => router.push('/product-doc')}
          className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80 shrink-0"
          style={{ background: 'var(--surface)', border: '1px solid var(--gold)', color: 'var(--gold)' }}
        >
          打开/编辑产品说明 →
        </button>
      </motion.div>

      {/* Advertiser dashboard */}
      <motion.div
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="mb-8"
      >
        <h3 className="font-bold mb-4" style={{ color: 'var(--text)' }}>广告主效果看板</h3>
        <AdvertiserDashboard />
      </motion.div>

      {/* Restart */}
      <motion.div
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="text-center py-8"
      >
        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>上传不同视频，体验 AI 如何适应不同场景</p>
        <button
          onClick={() => router.push('/')}
          className="px-8 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80"
          style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal)', color: 'var(--teal)' }}
        >
          重新上传视频 →
        </button>
      </motion.div>
    </main>
  )
}
