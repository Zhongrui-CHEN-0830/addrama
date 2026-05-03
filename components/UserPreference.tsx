'use client'

import { useState } from 'react'
import type { AdFormat } from '@/types'
import {
  DEFAULT_USER_AD_PREFERENCES,
  USER_AD_PREFERENCES_STORAGE_KEY,
  serializeUserAdPreferences,
  type UserAdPreferences,
} from '@/lib/user-preferences'

const CATEGORIES = ['美妆护肤', '饮料食品', '游戏娱乐', '电商优惠', '汽车出行', '旅游酒店', '数码家电']
const FORMAT_OPTIONS: Array<{ label: string; value: AdFormat }> = [
  { label: '更短广告', value: 'short' },
  { label: '剧情缓冲卡', value: 'buffer-card' },
  { label: '角色同款推荐', value: 'character-match' },
  { label: '互动换跳过', value: 'interactive' },
  { label: 'AI短剧广告', value: 'drama-style' },
  { label: '低打扰片尾广告', value: 'end-card' },
]

function toggleString(list: string[], value: string) {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value]
}

function toggleFormat(list: AdFormat[], value: AdFormat) {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value]
}

export default function UserPreference({ onSaved }: { onSaved?: (preferences: UserAdPreferences) => void }) {
  const [preferences, setPreferences] = useState<UserAdPreferences>(DEFAULT_USER_AD_PREFERENCES)
  const [saved, setSaved] = useState(false)

  function update(next: UserAdPreferences) {
    setPreferences(next)
    setSaved(false)
  }

  function handleSave() {
    const next = { ...preferences, lastUpdatedAt: new Date().toISOString() }
    sessionStorage.setItem(USER_AD_PREFERENCES_STORAGE_KEY, serializeUserAdPreferences(next))
    setPreferences(next)
    setSaved(true)
    onSaved?.(next)
  }

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>用户偏好反馈</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Demo 阶段仅记录在本次浏览器会话中，AI 后续会据此调整广告体验。
          </p>
        </div>
        {saved && <span className="text-xs font-bold" style={{ color: 'var(--teal)' }}>✓ 已记录</span>}
      </div>

      <section className="mb-4">
        <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>这条广告怎么样？</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => update({ ...preferences, useful: !preferences.useful, boring: false })}
            className="px-3 py-1.5 rounded-full text-xs border transition-all"
            style={{
              borderColor: preferences.useful ? 'var(--teal)' : 'var(--border)',
              background: preferences.useful ? 'var(--teal-dim)' : 'transparent',
              color: preferences.useful ? 'var(--teal)' : 'var(--muted)',
            }}
          >这条有用</button>
          <button
            onClick={() => update({ ...preferences, boring: !preferences.boring, useful: false })}
            className="px-3 py-1.5 rounded-full text-xs border transition-all"
            style={{
              borderColor: preferences.boring ? 'var(--red)' : 'var(--border)',
              background: preferences.boring ? 'var(--red-dim)' : 'transparent',
              color: preferences.boring ? 'var(--red)' : 'var(--muted)',
            }}
          >这条无聊</button>
        </div>
      </section>

      <section className="mb-4">
        <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>我更想看哪类广告？</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(category => {
            const active = preferences.preferredCategories.includes(category)
            return (
              <button key={category} onClick={() => update({ ...preferences, preferredCategories: toggleString(preferences.preferredCategories, category) })}
                className="px-2 py-1 rounded text-xs border transition-all"
                style={{ borderColor: active ? 'var(--gold)' : 'var(--border)', background: active ? 'var(--gold-dim)' : 'transparent', color: active ? 'var(--gold)' : 'var(--muted)' }}>
                {category}
              </button>
            )
          })}
        </div>
      </section>

      <section className="mb-4">
        <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>不想看这类广告</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(category => {
            const active = preferences.blockedCategories.includes(category)
            return (
              <button key={category} onClick={() => update({ ...preferences, blockedCategories: toggleString(preferences.blockedCategories, category) })}
                className="px-2 py-1 rounded text-xs border transition-all"
                style={{ borderColor: active ? 'var(--red)' : 'var(--border)', background: active ? 'var(--red-dim)' : 'transparent', color: active ? 'var(--red)' : 'var(--muted)' }}>
                {category}
              </button>
            )
          })}
        </div>
      </section>

      <section className="mb-4">
        <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>我偏好的广告体验</p>
        <div className="flex flex-wrap gap-2">
          {FORMAT_OPTIONS.map(option => {
            const active = preferences.preferredFormats.includes(option.value)
            return (
              <button key={option.value} onClick={() => update({ ...preferences, preferredFormats: toggleFormat(preferences.preferredFormats, option.value) })}
                className="px-2 py-1 rounded text-xs border transition-all"
                style={{ borderColor: active ? 'var(--teal)' : 'var(--border)', background: active ? 'var(--teal-dim)' : 'transparent', color: active ? 'var(--teal)' : 'var(--muted)' }}>
                {option.label}
              </button>
            )
          })}
        </div>
      </section>

      <button
        onClick={handleSave}
        className="w-full py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
        提交反馈，优化本次广告体验
      </button>
    </div>
  )
}
