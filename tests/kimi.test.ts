import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { kimiMessagesUrl } from '../lib/kimi-url'

describe('kimiMessagesUrl', () => {
  it('throws a clear configuration error when KIMI_BASE_URL is missing', () => {
    assert.throws(
      () => kimiMessagesUrl(undefined),
      /KIMI_BASE_URL is required/
    )
  })

  it('normalizes a Kimi Coding base URL to the Anthropic messages endpoint', () => {
    assert.equal(
      kimiMessagesUrl('https://api.kimi.com/coding/'),
      'https://api.kimi.com/coding/v1/messages'
    )
  })

  it('does not duplicate v1 when base URL already includes it', () => {
    assert.equal(
      kimiMessagesUrl('https://api.kimi.com/coding/v1/'),
      'https://api.kimi.com/coding/v1/messages'
    )
  })
})
