import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseCachedAdResult } from '../lib/ad-result'

const validResult = {
  sessionId: '',
  adCopyA: '广告A',
  adCopyB: '广告B',
  videoPromptA: 'prompt A',
  videoPromptB: 'prompt B',
  interactiveQuestion: '要不要看看？',
  fifteenSecScript: '0-3s intro',
  adFormat: 'buffer-card',
  adFormatReason: '低打扰',
  sceneAnalysis: {
    sceneType: '转场',
    emotionScore: 30,
    tags: ['转场'],
    advertisingRisk: 'low',
    recommendedAdType: '剧情缓冲卡',
    reasoning: '空镜适合插入',
  },
  rhythmTimeline: {
    segments: [{ startSec: 0, endSec: 10, risk: 'green', reason: '空镜', emotionScore: 20 }],
    recommendedInsertPoints: [8],
  },
}

describe('cached ad result helpers', () => {
  it('keeps AI analysis pending only when no cached result exists yet', () => {
    assert.deepEqual(parseCachedAdResult(null), { status: 'pending' })
  })

  it('returns an explicit error state for API error payloads so the analysis page does not spin forever', () => {
    assert.deepEqual(parseCachedAdResult(JSON.stringify({ error: 'Kimi error: timeout' })), {
      status: 'error',
      error: 'Kimi error: timeout',
    })
  })

  it('returns an explicit error state for invalid cached JSON so the polling loop can stop', () => {
    assert.equal(parseCachedAdResult('{bad json').status, 'error')
  })

  it('returns ready for a complete generated ad response', () => {
    const state = parseCachedAdResult(JSON.stringify(validResult))
    assert.equal(state.status, 'ready')
    if (state.status === 'ready') {
      assert.equal(state.result.adCopyA, '广告A')
    }
  })
})
