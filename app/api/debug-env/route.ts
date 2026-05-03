import { NextResponse } from 'next/server'

function envStatus(name: string) {
  const value = process.env[name]
  return {
    present: typeof value === 'string' && value.length > 0,
    length: typeof value === 'string' ? value.length : 0,
    hasLeadingOrTrailingWhitespace: typeof value === 'string' ? value !== value.trim() : false,
  }
}

export async function GET() {
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    kimiBaseUrl: envStatus('KIMI_BASE_URL'),
    kimiApiKey: envStatus('KIMI_API_KEY'),
    similarKimiEnvNames: Object.keys(process.env)
      .filter(name => name.toUpperCase().includes('KIMI'))
      .sort(),
  })
}
