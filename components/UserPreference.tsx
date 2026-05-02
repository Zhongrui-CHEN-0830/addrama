'use client'

import { useState } from 'react'

const NEGATIVE = ['🚫 不想再看', '⏱ 太长了', '❌ 和内容不相关']
const POSITIVE = ['👍 我喜欢这类广告', '⚡ 我想看更短广告', '🎮 我愿意互动换跳过']
const INTERESTS = ['🍜 美食', '🎮 游戏', '📱 数码', '💄 美妆', '✈️ 旅游', '🛒 电商优惠']

export default function UserPreference() {
  const [selected, setSelected] = useState<string[]>([])
  const [saved, setSaved] = useState(false)

  function toggle(label: string) {
    setSelected(prev => prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label])
  }

  function handleSave() {
    setSaved(true)
  }

  if (saved) {
    return (
      <div className="rounded-xl p-4 text-center" style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal)' }}>
        <p className="text-sm font-bold" style={{ color: 'var(--teal)' }}>
          ✓ 已记录，AI 将优化你的广告体验
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="font-bold text-sm mb-3" style={{ color: 'var(--text)' }}>这条广告怎么样？</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {[...NEGATIVE, ...POSITIVE].map(label => {
          const isNeg = NEGATIVE.includes(label)
          const isSelected = selected.includes(label)
          return (
            <button
              key={label}
              onClick={() => toggle(label)}
              className="px-3 py-1.5 rounded-full text-xs border transition-all"
              style={{
                borderColor: isSelected ? (isNeg ? 'var(--red)' : 'var(--teal)') : 'var(--border)',
                background: isSelected ? (isNeg ? 'var(--red-dim)' : 'var(--teal-dim)') : 'transparent',
                color: isSelected ? (isNeg ? 'var(--red)' : 'var(--teal)') : 'var(--muted)',
              }}>
              {label}
            </button>
          )
        })}
      </div>

      <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>
        我更想看：
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {INTERESTS.map(tag => {
          const isSelected = selected.includes(tag)
          return (
            <button
              key={tag}
              onClick={() => toggle(tag)}
              className="px-2 py-1 rounded text-xs border transition-all"
              style={{
                borderColor: isSelected ? 'var(--gold)' : 'var(--border)',
                background: isSelected ? 'var(--gold-dim)' : 'transparent',
                color: isSelected ? 'var(--gold)' : 'var(--muted)',
              }}>
              {tag}
            </button>
          )
        })}
      </div>

      <button
        onClick={handleSave}
        className="w-full py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
        提交反馈
      </button>
    </div>
  )
}
