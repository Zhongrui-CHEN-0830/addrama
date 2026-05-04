import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function readEnvKeys(path: string): string[] {
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => line.split('=', 1)[0])
}

describe('Kimi-only AI analysis configuration', () => {
  it('keeps lib/kimi.ts free of Claude provider selection and legacy proxy env fallbacks', () => {
    const source = readFileSync(join(process.cwd(), 'lib/kimi.ts'), 'utf8')

    assert.doesNotMatch(source, /AI_ANALYSIS_PROVIDER/)
    assert.doesNotMatch(source, /ANTHROPIC_[A-Z_]+/)
    assert.doesNotMatch(source, /PROXY_[A-Z_]+/)
    assert.doesNotMatch(source, /claude/i)
    assert.doesNotMatch(source, /anthropicMessagesUrl/)
    assert.match(source, /KIMI_API_KEY/)
    assert.match(source, /KIMI_BASE_URL/)
  })

  it('keeps local AI analysis env names Kimi-only while preserving non-AI integrations such as Libtv', () => {
    const keys = readEnvKeys(join(process.cwd(), '.env.local'))

    assert.ok(keys.includes('KIMI_API_KEY'))
    assert.ok(keys.includes('KIMI_BASE_URL'))
    assert.ok(keys.includes('LIBTV_ACCESS_KEY'))
    assert.ok(keys.includes('BLOB_READ_WRITE_TOKEN'))
    assert.ok(!keys.includes('AI_ANALYSIS_PROVIDER'))
    assert.ok(!keys.some(key => key.startsWith('ANTHROPIC_')))
    assert.ok(!keys.some(key => key.startsWith('PROXY_')))
  })
})
