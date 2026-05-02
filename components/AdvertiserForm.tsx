'use client'

import { useState } from 'react'
import type { AdvertiserInput } from '@/types'

const DEFAULT: AdvertiserInput = {
  brandName: '某气泡水品牌',
  productName: '0糖0脂气泡水',
  keySellingPoint: '0糖0脂，清爽解腻',
  bannedWords: '最好、第一、绝对',
  targetAudience: '18-35岁年轻用户',
  brandTone: '清爽、活力、现代',
}

interface AdvertiserFormProps {
  onChange?: (v: AdvertiserInput) => void
}

export default function AdvertiserForm({ onChange }: AdvertiserFormProps) {
  const [values, setValues] = useState<AdvertiserInput>(DEFAULT)

  function update(field: keyof AdvertiserInput, value: string) {
    const next = { ...values, [field]: value }
    setValues(next)
    onChange?.(next)
  }

  const fields: Array<{ key: keyof AdvertiserInput; label: string; placeholder: string }> = [
    { key: 'brandName', label: '品牌名', placeholder: '某气泡水品牌' },
    { key: 'productName', label: '商品名', placeholder: '0糖0脂气泡水' },
    { key: 'keySellingPoint', label: '核心卖点', placeholder: '0糖0脂，清爽解腻' },
    { key: 'bannedWords', label: '禁用词', placeholder: '最好、第一、绝对' },
    { key: 'targetAudience', label: '目标人群', placeholder: '18-35岁年轻用户' },
    { key: 'brandTone', label: '品牌调性', placeholder: '清爽、活力、现代' },
  ]

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="text-[9px] font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--muted)' }}>
        广告主输入（demo 已预填，可修改）
      </div>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="text-[9px] font-bold tracking-widest uppercase block mb-1" style={{ color: 'var(--muted)' }}>
              {label}
            </label>
            <input
              className="w-full rounded-md px-3 py-2 text-sm outline-none transition-all"
              style={{
                background: '#080810',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontFamily: 'inherit',
              }}
              value={values[key]}
              placeholder={placeholder}
              onChange={e => update(key, e.target.value)}
              onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
