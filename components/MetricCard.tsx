'use client'

import { motion } from 'framer-motion'

interface MetricCardProps {
  value: string
  label: string
  delta?: string
  positive?: boolean
  color?: string
}

export default function MetricCard({ value, label, delta, positive = true, color = 'var(--gold)' }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="rounded-xl p-4 text-center"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <p className="font-display text-3xl mb-1" style={{ color, lineHeight: 1 }}>{value}</p>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>{label}</p>
      {delta && (
        <p className="text-[10px] mt-1 font-mono-syne" style={{ color: positive ? 'var(--green)' : 'var(--red)' }}>
          {delta}
        </p>
      )}
    </motion.div>
  )
}
