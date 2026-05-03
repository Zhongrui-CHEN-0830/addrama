import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  canDismissNonSkippableAd,
  chooseInsertPoint,
  formatMediaTime,
  getAdGateRemainingSeconds,
  NON_SKIPPABLE_AD_SECONDS,
  shouldTriggerNonSkippableAd,
} from '../lib/media-gate'
import { DEFAULT_PRODUCT_DOC, normalizeProductDoc } from '../lib/product-doc'

describe('media gate helpers', () => {
  it('chooses Kimi recommended insert point when it is inside video duration', () => {
    assert.equal(chooseInsertPoint([12, 20], 60), 12)
  })

  it('falls back to a duration-aware midpoint for short reviewer demo videos', () => {
    assert.equal(chooseInsertPoint([90], 20), 10)
  })

  it('formats media time for progress controls', () => {
    assert.equal(formatMediaTime(0), '0:00')
    assert.equal(formatMediaTime(65.9), '1:05')
  })

  it('triggers the non-skippable ad only once after the insert point', () => {
    assert.equal(shouldTriggerNonSkippableAd({ currentTime: 11.9, insertPoint: 12, alreadyTriggered: false }), false)
    assert.equal(shouldTriggerNonSkippableAd({ currentTime: 12, insertPoint: 12, alreadyTriggered: false }), true)
    assert.equal(shouldTriggerNonSkippableAd({ currentTime: 20, insertPoint: 12, alreadyTriggered: true }), false)
  })

  it('keeps ad locked for the configured non-skippable duration', () => {
    assert.equal(NON_SKIPPABLE_AD_SECONDS, 8)
    assert.equal(getAdGateRemainingSeconds(1_000, 1_000), 8)
    assert.equal(getAdGateRemainingSeconds(1_000, 4_900), 5)
    assert.equal(canDismissNonSkippableAd(1_000, 8_900), false)
    assert.equal(canDismissNonSkippableAd(1_000, 9_000), true)
  })
})

describe('product doc helpers', () => {
  it('uses default product doc for missing or blank saved content', () => {
    assert.equal(normalizeProductDoc(undefined), DEFAULT_PRODUCT_DOC)
    assert.equal(normalizeProductDoc('   '), DEFAULT_PRODUCT_DOC)
  })

  it('preserves editable product doc text', () => {
    assert.equal(normalizeProductDoc('# 自定义说明\n内容'), '# 自定义说明\n内容')
  })
})
