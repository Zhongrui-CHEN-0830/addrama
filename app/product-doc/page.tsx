'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { DEFAULT_PRODUCT_DOC, PRODUCT_DOC_STORAGE_KEY, normalizeProductDoc } from '@/lib/product-doc'

export default function ProductDocPage() {
  const router = useRouter()
  const [doc, setDoc] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_PRODUCT_DOC
    return normalizeProductDoc(window.sessionStorage.getItem(PRODUCT_DOC_STORAGE_KEY))
  })
  const [saved, setSaved] = useState(false)

  function saveDoc() {
    sessionStorage.setItem(PRODUCT_DOC_STORAGE_KEY, normalizeProductDoc(doc))
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  function resetDoc() {
    setDoc(DEFAULT_PRODUCT_DOC)
    sessionStorage.setItem(PRODUCT_DOC_STORAGE_KEY, DEFAULT_PRODUCT_DOC)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
        <p className="text-xs font-mono-syne tracking-widest mb-2" style={{ color: 'var(--gold)' }}>
          ADDRAMA AI · 产品说明文档
        </p>
        <h2 className="font-display text-4xl mb-2" style={{ color: 'var(--gold)', lineHeight: 1 }}>
          面向评委的 Demo 说明
        </h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          左侧可编辑保存，右侧实时预览。保存内容仅存于本次浏览器会话，适合答辩前快速调整讲解重点。
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <section className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold" style={{ color: 'var(--text)' }}>编辑区</h3>
            {saved && <span className="text-xs font-bold" style={{ color: 'var(--teal)' }}>✓ 已保存</span>}
          </div>
          <textarea
            value={doc}
            onChange={event => setDoc(event.target.value)}
            className="w-full min-h-[560px] rounded-lg p-4 text-sm font-mono outline-none"
            style={{ background: '#050807', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </section>

        <section className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--gold)' }}>
          <h3 className="font-bold mb-3" style={{ color: 'var(--gold)' }}>评委预览</h3>
          <div className="space-y-3 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
            {normalizeProductDoc(doc)}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          onClick={() => router.push('/value')}
          className="px-5 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
        >
          返回三方价值
        </button>
        <button
          onClick={resetDoc}
          className="px-5 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80"
          style={{ background: 'var(--purple-dim)', border: '1px solid var(--purple)', color: 'var(--purple)' }}
        >
          恢复默认说明
        </button>
        <button
          onClick={saveDoc}
          className="px-8 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80"
          style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold)', color: 'var(--gold)' }}
        >
          保存说明文档
        </button>
      </div>
    </main>
  )
}
