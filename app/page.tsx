'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import VideoUpload from '@/components/VideoUpload'

export default function HomePage() {
  const router = useRouter()
  const [blobUrl, setBlobUrl] = useState('')

  function handleUploadComplete(blob: string) {
    setBlobUrl(blob)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl w-full text-center mb-10"
      >
        <p className="text-xs font-mono-syne tracking-widest mb-3" style={{ color: 'var(--teal)' }}>
          ADDRAMA AI · 广告导演
        </p>
        <h1 className="font-display text-6xl mb-4" style={{ color: 'var(--gold)', lineHeight: 1 }}>
          让广告不再打断剧情
        </h1>
        <p className="text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
          上传任意视频片段，对比传统广告与 AI 驱动广告的体验差异。<br />
          Kimi k2.6 理解视频场景，Seedance 2.0 生成专属广告。
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="max-w-xl w-full mb-8"
      >
        <VideoUpload onUploadComplete={handleUploadComplete} />
      </motion.div>

      {blobUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex gap-4"
        >
          <button
            onClick={() => router.push('/before')}
            className="px-8 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80"
            style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', color: 'var(--red)' }}
          >
            体验改造前 →
          </button>
          <button
            onClick={() => router.push('/after')}
            className="px-8 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80"
            style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal)', color: 'var(--teal)' }}
          >
            直接体验改造后 →
          </button>
        </motion.div>
      )}

      {/* Three value preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="grid grid-cols-3 gap-4 max-w-2xl w-full mt-12"
      >
        {[
          { icon: '👤', title: '用户', desc: '广告不再打断剧情高潮，更短更相关，可互动换跳过' },
          { icon: '📺', title: '平台', desc: '广告负反馈 ↓61%，完播率 ↑34%，不损失收入' },
          { icon: '📢', title: '广告主', desc: '互动率 ↑48%，场景匹配转化 ↑2.3×，AI 生成多版本' },
        ].map(item => (
          <div key={item.title} className="rounded-xl p-4 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="text-2xl mb-2">{item.icon}</div>
            <p className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>{item.title}</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{item.desc}</p>
          </div>
        ))}
      </motion.div>
    </main>
  )
}
