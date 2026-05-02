import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AdDrama AI · 广告导演',
  description: '让广告从打断剧情变成剧情感知的轻互动内容',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  )
}
