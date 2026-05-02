import type { AdStatusResponse } from '@/types'

const LIBTV_BASE = 'https://im.liblib.tv'
const ACCESS_KEY = process.env.LIBTV_ACCESS_KEY!

function libtvHeaders() {
  return {
    'Authorization': `Bearer ${ACCESS_KEY}`,
    'Content-Type': 'application/json',
  }
}

export interface LibtvSession {
  projectUuid: string
  sessionId: string
  projectUrl: string
}

export async function createLibtvSession(message: string): Promise<LibtvSession> {
  const res = await fetch(`${LIBTV_BASE}/openapi/session`, {
    method: 'POST',
    headers: libtvHeaders(),
    body: JSON.stringify({ message }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Libtv createSession error ${res.status}: ${err}`)
  }

  const json = await res.json()
  const data = json.data ?? {}

  return {
    projectUuid: data.projectUuid ?? '',
    sessionId: data.sessionId ?? '',
    projectUrl: data.projectUuid
      ? `https://www.liblib.tv/canvas?projectId=${data.projectUuid}`
      : '',
  }
}

export async function queryLibtvSession(
  sessionId: string,
  afterSeq = 0
): Promise<AdStatusResponse> {
  const url = afterSeq > 0
    ? `${LIBTV_BASE}/openapi/session/${sessionId}?afterSeq=${afterSeq}`
    : `${LIBTV_BASE}/openapi/session/${sessionId}`

  const res = await fetch(url, {
    method: 'GET',
    headers: libtvHeaders(),
  })

  if (!res.ok) {
    return { status: 'error' }
  }

  const json = await res.json()
  const messages: Array<{ role: string; content: string }> = json.data?.messages ?? []

  // Find assistant message containing a video URL
  const assistantMsg = messages.find(
    m => m.role === 'assistant' && /https?:\/\/\S+\.(mp4|webm|mov)/i.test(m.content)
  )

  if (assistantMsg) {
    const match = assistantMsg.content.match(/https?:\/\/\S+\.(mp4|webm|mov)/i)
    return {
      status: 'done',
      videoUrl: match?.[0] ?? '',
    }
  }

  return { status: 'pending' }
}
