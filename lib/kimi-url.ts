const KIMI_BASE_URL_REQUIRED_MESSAGE =
  'KIMI_BASE_URL is required. Set it in Vercel Environment Variables and .env.local.'

export function kimiMessagesUrl(baseUrl: string | undefined): string {
  if (!baseUrl) {
    throw new Error(KIMI_BASE_URL_REQUIRED_MESSAGE)
  }

  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  // Kimi Coding 的 Anthropic-compatible base URL 是 https://api.kimi.com/coding/，
  // 但 Messages endpoint 仍然在 /v1/messages；Anthropic SDK 会自动拼 /v1/messages，
  // 这里直接 fetch 时需要显式拼出来。
  if (base.endsWith('/v1/')) return `${base}messages`
  return `${base}v1/messages`
}
