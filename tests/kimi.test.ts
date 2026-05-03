import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildKimiContentBlocks,
  buildFrameAnalysisPrompt,
  kimiMessagesUrl,
} from '../lib/kimi-url'

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

describe('buildKimiContentBlocks', () => {
  it('uses a supported single image block for image inputs', () => {
    assert.deepEqual(buildKimiContentBlocks({ mediaType: 'image/png', mediaBase64: 'abc', prompt: 'p' }), [
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'abc' } },
      { type: 'text', text: 'p' },
    ])
  })

  it('builds ordered timestamped frame image blocks for video frame analysis', () => {
    const blocks = buildKimiContentBlocks({
      mediaType: 'video/mp4',
      mediaBase64: 'video-ignored',
      prompt: 'p',
      frames: [
        { timestampSec: 0, imageBase64: 'frame0', mediaType: 'image/jpeg' },
        { timestampSec: 12.5, imageBase64: 'frame12', mediaType: 'image/jpeg' },
      ],
    })

    assert.deepEqual(blocks, [
      { type: 'text', text: '下面是从用户上传视频中按时间顺序抽取的关键帧。请结合每张图前的时间戳判断剧情节奏、广告插入风险和广告类型。' },
      { type: 'text', text: '视频帧 t=0.0s' },
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'frame0' } },
      { type: 'text', text: '视频帧 t=12.5s' },
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'frame12' } },
      { type: 'text', text: 'p' },
    ])
  })

  it('does not send unsupported video blocks when frames are unavailable', () => {
    assert.deepEqual(buildKimiContentBlocks({ mediaType: 'video/mp4', mediaBase64: 'abc', prompt: 'p' }), [
      { type: 'text', text: 'p' },
    ])
  })
})

describe('buildFrameAnalysisPrompt', () => {
  it('includes frame timestamps and asks Kimi to choose insertion points from frame times', () => {
    const prompt = buildFrameAnalysisPrompt({ basePrompt: 'base', frameTimes: [0, 8, 16] })
    assert.match(prompt, /抽帧时间点：0\.0s, 8\.0s, 16\.0s/)
    assert.match(prompt, /recommendedInsertPoints/)
    assert.match(prompt, /必须优先从上述抽帧时间点附近选择/)
  })
})
