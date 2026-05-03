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
  buildLibtvMessage,
} from '../lib/libtv'
import {
  DEFAULT_USER_AD_PREFERENCES,
  serializeUserAdPreferences,
  parseUserAdPreferences,
} from '../lib/user-preferences'
import { parseKimiJsonResponse } from '../lib/kimi-response'
import { buildVideoFrameTimes, DEFAULT_FRAME_COUNT } from '../lib/video-frames'

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

describe('video frame extraction helpers', () => {
  it('samples more frames at a higher default frequency for deeper Kimi scene understanding', () => {
    assert.equal(DEFAULT_FRAME_COUNT, 12)
    assert.deepEqual(buildVideoFrameTimes(24, DEFAULT_FRAME_COUNT), [
      1.2, 3.2, 5.1, 7.1, 9.1, 11, 13, 14.9, 16.9, 18.9, 20.8, 22.8,
    ])
  })
})

describe('buildKimiPrompt', () => {


  it('uses the five demo advertiser assets from the desktop material file', () => {
    assert.deepEqual(MOCK_ADVERTISERS.map(asset => asset.id), [
      'beverage-yuanqi-sparkling-water',
      'beauty-florasis-lipstick',
      'sports-nike-running-shoes',
      'auto-byd-new-energy',
      'travel-ctrip-package',
    ])

    const prompt = buildKimiPrompt({
      adLibrary: MOCK_ADVERTISERS,
      userPreferences: DEFAULT_USER_AD_PREFERENCES,
    })

    assert.match(prompt, /花西子/)
    assert.match(prompt, /Nike/)
    assert.match(prompt, /携程旅行/)
    assert.doesNotMatch(prompt, /欧莱雅/)
    assert.doesNotMatch(prompt, /暗门档案/)
    assert.doesNotMatch(prompt, /山海行旅/)
  })

  it('requires Kimi to select a mock advertiser asset before rewriting the ad', () => {
    const prompt = buildKimiPrompt({
      adLibrary: MOCK_ADVERTISERS,
      userPreferences: DEFAULT_USER_AD_PREFERENCES,
    })

    assert.match(prompt, /必须先从广告库中选择一个最匹配的广告素材/)
    assert.match(prompt, /selectedAdvertiser/)
    assert.match(prompt, /beauty-florasis-lipstick/)
    assert.match(prompt, /beverage-yuanqi-sparkling-water/)
    assert.match(prompt, /auto-byd-new-energy/)
    assert.match(prompt, /buffer-card/)
    assert.match(prompt, /end-card/)
    assert.match(prompt, /视频生成 prompt 质量要求/)
    assert.match(prompt, /剧情缓冲卡/)
    assert.match(prompt, /角色同款推荐/)
    assert.match(prompt, /AI短剧式广告/)
    assert.match(prompt, /bannedWords/)
  })
  it('asks Kimi for a two-layer scene diagnosis and Libtv director package JSON', () => {
    const prompt = buildKimiPrompt({
      adLibrary: MOCK_ADVERTISERS,
      userPreferences: DEFAULT_USER_AD_PREFERENCES,
    })

    assert.match(prompt, /VideoSceneUnderstanding/)
    assert.match(prompt, /AdDirectionPackage/)
    assert.match(prompt, /creativeBrief/)
    assert.match(prompt, /sceneBridge/)
    assert.match(prompt, /shotList/)
    assert.match(prompt, /voiceoverScript/)
    assert.match(prompt, /subtitleScript/)
    assert.match(prompt, /visualStyle/)
    assert.match(prompt, /productIntegration/)
    assert.match(prompt, /negativePrompt/)
    assert.match(prompt, /libtvPromptA/)
    assert.match(prompt, /libtvPromptB/)
    assert.match(prompt, /Prompt Quality Gate/)
  })

  it('uses advertiser assets as generation-ready material, not just brand metadata', () => {
    const lipstick = MOCK_ADVERTISERS.find(asset => asset.id === 'beauty-florasis-lipstick')

    assert.ok(lipstick)
    assert.deepEqual(lipstick.assetVisualElements.slice(0, 3), ['双鹤 LOGO', '金色线条管身', '雕花膏体'])
    assert.match(lipstick.usageScenarios.join('、'), /古装妆容灵感转现实/)
    assert.match(lipstick.emotionalMapping.join('、'), /温柔/)
    assert.match(lipstick.cameraSuggestions.join('、'), /macro close-up/)
    assert.match(lipstick.audioSuggestions.join('、'), /镜盒开合声/)
    assert.match(lipstick.forbiddenRepresentations.join('、'), /永久改变肤质/)
    assert.match(lipstick.formatFit['character-match'] ?? '', /同款灵感/)
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
            videos: [{ downloadUrl: 'https://libtv-res.liblib.art/claw/p/b.mp4' }],
            images: [{ path: 'https://libtv-res.liblib.art/claw/p/c.png' }],
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

  it('builds a brand- and format-aware prompt for Libtv video generation', () => {
    const message = buildLibtvMessage({
      videoPrompt: 'A cinematic scene-aware lipstick recommendation card',
      adFormat: 'character-match',
      adCopy: '女主同款桃花妆，一抹入戏',
      advertiser: MOCK_ADVERTISERS.find(asset => asset.id === 'beauty-florasis-lipstick'),
      sceneContext: '古装剧梳妆转场，情绪平缓，适合角色同款推荐。',
      script: '0-3秒：梳妆镜与桃花色口红；3-8秒：产品特写；8-12秒：角色同款推荐卡。',
    })

    assert.match(message, /品牌：花西子/)
    assert.match(message, /商品：东方雕花口红/)
    assert.match(message, /核心卖点：雕花膏体与东方美学包装/)
    assert.match(message, /品牌调性：东方雅致、国潮、高级、细腻、仪式感/)
    assert.match(message, /广告形式：角色同款推荐/)
    assert.match(message, /必须生成真实可播放视频/)
    assert.match(message, /不要只生成静态海报/)
    assert.match(message, /不要使用真实演员姓名/)
    assert.match(message, /不宣称官方联名/)
    assert.match(message, /镜头1：从当前剧情情绪/)
    assert.match(message, /禁止词不得出现在字幕、旁白、画面文字/)
    assert.match(message, /以中文结构化要求为最高优先级/)
    assert.match(message, /禁止出现或暗示的词：医美、永久、最显白、必买/)
  })

  it('adds specific director constraints for buffer cards and short-drama ads', () => {
    const bufferCard = buildLibtvMessage({
      videoPrompt: 'Atmospheric sparkling water transition card',
      adFormat: 'buffer-card',
      advertiser: MOCK_ADVERTISERS.find(asset => asset.id === 'beverage-yuanqi-sparkling-water'),
    })
    assert.match(bufferCard, /剧情缓冲卡/)
    assert.match(bufferCard, /剧情章节之间的高级动态转场/)
    assert.match(bufferCard, /观众应该感觉“这是剧情呼吸点”/)
    assert.match(bufferCard, /不要价格、不要强 CTA/)

    const dramaStyle = buildLibtvMessage({
      videoPrompt: 'A compact EV micro drama in a neon city',
      adFormat: 'drama-style',
      advertiser: MOCK_ADVERTISERS.find(asset => asset.id === 'auto-byd-new-energy'),
    })
    assert.match(dramaStyle, /AI短剧式广告/)
    assert.match(dramaStyle, /开端：一个与当前剧情相似的生活化小冲突/)
    assert.match(dramaStyle, /不要冒充原剧官方剧情/)
    assert.match(dramaStyle, /相似情绪结构/)
  })
  it('prefers a complete Kimi Libtv director prompt and enriches it with structured shot assets', () => {
    const advertiser = MOCK_ADVERTISERS.find(asset => asset.id === 'beauty-florasis-lipstick')
    const message = buildLibtvMessage({
      videoPrompt: 'fallback short prompt should not be the main instruction',
      libtvPrompt: '完整导演提示词A：中文导演要求，分镜表，English visual generation prompt, Negative prompt, generate mp4/webm/mov.',
      adFormat: 'character-match',
      adCopy: '这一抹温柔，刚好入戏',
      advertiser,
      sceneContext: 'videoSceneUnderstanding: 古装梳妆，烛光、铜镜，人物释然，插入风险 low。',
      adDirection: {
        creativeBrief: '以古装梳妆情绪转译东方雕花口红，像角色气质的现实延伸。',
        sceneBridge: 'match cut from original warm candlelight into a mirror reflection, avoid abrupt commercial break.',
        shotList: [
          {
            shot: 1,
            timeRange: '0-2s',
            visual: '承接原剧昏黄烛光，镜头从妆台铜镜慢慢推近。',
            camera: 'slow push-in, shallow depth of field',
            transition: 'match cut from original warm light',
            productRole: '先用暖桃色花瓣暗示色彩，不直接大面积露出商品。',
            subtitle: '这一抹温柔，刚好入戏',
            voiceover: '把剧里的温柔气色，带回日常。',
            sound: 'soft guzheng, light fabric movement',
          },
        ],
        voiceover: { content: '把剧里的温柔气色，带回日常。', tone: '温柔克制', voice: '女声', speed: '中慢速', emotion: '松弛' },
        voiceoverScript: '0-2s 女声：把剧里的温柔气色，带回日常。',
        subtitles: [{ timeRange: '0-2s', text: '这一抹温柔，刚好入戏', maxChars: 12 }],
        subtitleScript: [{ timeRange: '0-2s', text: '这一抹温柔，刚好入戏', maxChars: 12 }],
        audioDirection: 'soft guzheng, mirror compact click, light fabric movement',
        visualStyle: 'cinematic soft focus, warm candlelight, macro close-up, mirror reflection',
        productIntegration: '商品作为妆台道具与现实生活方式延伸，露出约 2 秒，不硬切电商页。',
        negativePrompt: 'no static poster, no giant text, no cheap e-commerce layout, no fake celebrity',
      },
      promptQualityGate: { passed: true, checkedItems: ['明确分镜', 'mp4/webm/mov'], missingItems: [] },
    })

    assert.match(message, /完整导演提示词A/)
    assert.match(message, /优先采用 Kimi 已生成的完整 Libtv 导演提示词/)
    assert.match(message, /creativeBrief/)
    assert.match(message, /承接原剧昏黄烛光/)
    assert.match(message, /voiceoverScript/)
    assert.match(message, /subtitleScript/)
    assert.match(message, /assetVisualElements/)
    assert.match(message, /forbiddenRepresentations/)
    assert.match(message, /Prompt Quality Gate: passed/)
    assert.doesNotMatch(message, /^视频创意英文提示词：fallback short prompt should not be the main instruction$/m)
  })
})

describe('parseKimiJsonResponse', () => {
  it('repairs common non-strict JSON returned by Kimi', () => {
    const parsed = parseKimiJsonResponse(`下面是分析结果：
{
  "adCopyA": "英雄同款补水霜",
  "adCopyB": "上妆前先稳住状态",
  "videoPromptA": "A cinematic product shot",
  "videoPromptB": "A softer lifestyle shot",
  "interactiveQuestion": "想看同款吗？",
  "fifteenSecScript": "画面：女主梳妆，旁白：关键时刻也要稳住底妆。",
  "adFormat": "character-match",
  "adFormatReason": "画面有妆造展示，适合同款推荐",
  "sceneAnalysis": {
    "sceneType": "古装剧·梳妆场景",
    "emotionScore": 42,
    "tags": ["古装", "梳妆", "美妆"],
    "advertisingRisk": "low",
    "recommendedAdType": "角色同款推荐",
    "reasoning": "场景节奏平缓，商品植入自然",
  },
  "rhythmTimeline": {
    "segments": [
      {
        "startSec": 0,
        "endSec": 8,
        "risk": "green",
        "reason": "空镜转场",
        "emotionScore": 30,
      },
    ],
    "recommendedInsertPoints": [8,],
  },
}
补充说明请忽略。`)

    assert.equal(parsed.adCopyA, '英雄同款补水霜')
    assert.deepEqual(parsed.rhythmTimeline.recommendedInsertPoints, [8])
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
