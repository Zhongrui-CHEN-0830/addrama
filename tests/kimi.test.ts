import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildKimiContentBlocks,
  buildFrameAnalysisPrompt,
  buildKimiPrompt,
  kimiMessagesUrl,
} from '../lib/kimi-url'
import { MOCK_ADVERTISERS } from '../lib/mock-advertisers'
import {
  extractGeneratedMediaUrls,
  isLibtvConfigured,
  buildProjectUrl,
  selectBestGeneratedMediaUrl,
} from '../lib/libtv'
import {
  DEFAULT_USER_AD_PREFERENCES,
  serializeUserAdPreferences,
  parseUserAdPreferences,
} from '../lib/user-preferences'

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

describe('buildKimiPrompt', () => {
  it('requires Kimi to select a mock advertiser asset before rewriting the ad', () => {
    const prompt = buildKimiPrompt({
      adLibrary: MOCK_ADVERTISERS,
      userPreferences: DEFAULT_USER_AD_PREFERENCES,
    })

    assert.match(prompt, /必须先从广告库中选择一个最匹配的广告素材/)
    assert.match(prompt, /selectedAdvertiser/)
    assert.match(prompt, /beauty-peach-makeup/)
    assert.match(prompt, /buffer-card/)
    assert.match(prompt, /end-card/)
  })
})

describe('libtv helpers', () => {
  it('detects missing and present Libtv access keys', () => {
    assert.equal(isLibtvConfigured(''), false)
    assert.equal(isLibtvConfigured(undefined), false)
    assert.equal(isLibtvConfigured('abc'), true)
  })

  it('builds project canvas URLs from projectUuid', () => {
    assert.equal(
      buildProjectUrl(' project-123 '),
      'https://www.liblib.tv/canvas?projectId=project-123'
    )
  })

  it('extracts generated media URLs from assistant text and tool task_result payloads', () => {
    const urls = extractGeneratedMediaUrls([
      {
        role: 'assistant',
        content: '结果：https://libtv-res.liblib.art/claw/p/a.mp4',
      },
      {
        role: 'tool',
        content: JSON.stringify({
          task_result: {
            videos: [{ previewPath: 'https://libtv-res.liblib.art/claw/p/b.mp4' }],
            images: [{ previewPath: 'https://libtv-res.liblib.art/claw/p/c.png' }],
          },
        }),
      },
      {
        role: 'assistant',
        content: '重复 https://libtv-res.liblib.art/claw/p/a.mp4',
      },
    ])

    assert.deepEqual(urls, [
      'https://libtv-res.liblib.art/claw/p/a.mp4',
      'https://libtv-res.liblib.art/claw/p/b.mp4',
      'https://libtv-res.liblib.art/claw/p/c.png',
    ])
  })

  it('prefers playable video URLs over image URLs for the ad player', () => {
    assert.equal(
      selectBestGeneratedMediaUrl([
        'https://libtv-res.liblib.art/claw/p/a.png',
        'https://libtv-res.liblib.art/claw/p/b.mp4',
      ]),
      'https://libtv-res.liblib.art/claw/p/b.mp4'
    )
  })
})

describe('user preference helpers', () => {
  it('round-trips demo user ad preferences through sessionStorage-safe JSON', () => {
    const encoded = serializeUserAdPreferences({
      ...DEFAULT_USER_AD_PREFERENCES,
      useful: true,
      boring: false,
      preferredCategories: ['美妆护肤'],
      blockedCategories: ['游戏娱乐'],
      preferredFormats: ['interactive', 'end-card'],
      lastUpdatedAt: '2026-05-03T00:00:00.000Z',
    })

    assert.deepEqual(parseUserAdPreferences(encoded), {
      useful: true,
      boring: false,
      preferredCategories: ['美妆护肤'],
      blockedCategories: ['游戏娱乐'],
      preferredFormats: ['interactive', 'end-card'],
      lastUpdatedAt: '2026-05-03T00:00:00.000Z',
    })
  })
})
