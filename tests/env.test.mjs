import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

function parseDotEnv(text) {
  const result = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const equalsIndex = line.indexOf('=')
    if (equalsIndex === -1) continue
    const key = line.slice(0, equalsIndex)
    let value = line.slice(equalsIndex + 1)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    result[key] = value
  }
  return result
}

describe('Kimi environment configuration', () => {
  it('requires KIMI_API_KEY and KIMI_BASE_URL in a pulled Vercel env file', () => {
    const envPath = process.env.ADDRAMA_ENV_FILE
    assert.ok(envPath, 'Set ADDRAMA_ENV_FILE to a Vercel-pulled env file path, for example .env.vercel.production')

    const envText = readFileSync(envPath, 'utf8')
    const env = parseDotEnv(envText)

    assert.ok(env.KIMI_BASE_URL, 'KIMI_BASE_URL is missing from pulled env file')
    assert.ok(env.KIMI_API_KEY, 'KIMI_API_KEY is missing from pulled env file')
  })
})
