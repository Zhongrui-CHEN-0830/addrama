'use client'

import { usePathname } from 'next/navigation'

const STEPS = [
  { label: '首页', path: '/' },
  { label: '改造前', path: '/before' },
  { label: 'AI 分析', path: '/ai-analysis' },
  { label: '改造后', path: '/after' },
  { label: '三方价值', path: '/value' },
]

export default function Stepper() {
  const pathname = usePathname()
  const currentIndex = STEPS.findIndex(s => s.path === pathname)

  if (currentIndex === -1) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-0 px-8 py-3"
      style={{ background: 'rgba(6,6,10,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
      {STEPS.map((step, i) => (
        <div key={step.path} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all"
              style={{
                borderColor: i < currentIndex ? 'var(--teal)' : i === currentIndex ? 'var(--gold)' : 'var(--border)',
                background: i < currentIndex ? 'var(--teal-dim)' : i === currentIndex ? 'var(--gold-dim)' : 'transparent',
                color: i < currentIndex ? 'var(--teal)' : i === currentIndex ? 'var(--gold)' : 'var(--muted)',
              }}>
              {i < currentIndex ? '✓' : i + 1}
            </div>
            <span className="text-[9px] mt-1 whitespace-nowrap"
              style={{ color: i === currentIndex ? 'var(--text)' : 'var(--muted)' }}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="w-12 h-0.5 mx-1 mb-4"
              style={{ background: i < currentIndex ? 'var(--teal)' : 'var(--border)' }} />
          )}
        </div>
      ))}
    </div>
  )
}
