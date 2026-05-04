import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'

import { POST as createLibtvAdRoute } from '../app/api/generate-libtv-ad/route'
import { GET as getLibtvAdJobRoute } from '../app/api/generate-libtv-ad/[jobId]/route'
import { createLibtvAdJob, getLibtvAdJob, markLibtvAdJobDone, resetLibtvAdJobs, serializeLibtvAdJob } from '../lib/libtv-ad-job-store'
import type { GenerateAdResponse } from '../types'

function makeAnalysisResult(): GenerateAdResponse {
  return {
    sessionId: '',
    adCopyA: '剧情暂停一秒，花西子轻轻出现',
    adCopyB: '花西子，把剧感带回日常',
    videoPromptA: 'Cinematic character-match lipstick card',
    videoPromptB: 'Cinematic lipstick lifestyle prompt',
    interactiveQuestion: '想看同款灵感吗？',
    fifteenSecScript: '0-3秒：承接古装梳妆转场。3-8秒：产品特写。8-15秒：回剧情。',
    adFormat: 'character-match',
    adFormatReason: '妆造与国风口红素材匹配',
    selectedAdvertiser: { id: 'beauty-florasis-lipstick', industry: '美妆/彩妆', brandName: '花西子', productName: '东方雕花口红', matchReason: '镜前空镜节奏平缓，适合同款灵感推荐' },
    videoSceneUnderstanding: {
      sceneType: '古装剧·梳妆转场',
      emotionCurve: [{ timeRange: '0-关键帧末尾', emotion: '平缓', intensity: 38 }],
      rhythmTimeline: { segments: [], recommendedInsertPoints: [8.4] },
      visualMotifs: ['古装', '梳妆', '铜镜'],
      characterState: '人物情绪相对稳定',
      adInsertionRisk: 'low',
      bestInsertReason: '镜前空镜节奏平缓，适合同款灵感推荐',
    },
    sceneAnalysis: { sceneType: '古装剧·梳妆转场', emotionScore: 38, tags: ['古装', '梳妆', '铜镜'], advertisingRisk: 'low', recommendedAdType: '角色同款推荐', reasoning: '镜前空镜节奏平缓，适合同款灵感推荐' },
    rhythmTimeline: { segments: [], recommendedInsertPoints: [8.4] },
  }
}

describe('generate-libtv-ad async job flow', () => {
  beforeEach(() => resetLibtvAdJobs())

  it('creates a pending Libtv job from a cached AI recommendation without re-running video analysis', () => {
    const analysis = makeAnalysisResult()
    const job = createLibtvAdJob({ analysis })

    assert.equal(job.status, 'pending')
    assert.equal(job.stage, 'queued')
    assert.equal(getLibtvAdJob(job.jobId)?.input.analysis.sceneAnalysis.sceneType, '古装剧·梳妆转场')
  })

  it('stores Libtv sessions separately from the AI recommendation payload', () => {
    const analysis = makeAnalysisResult()
    const job = createLibtvAdJob({ analysis })

    markLibtvAdJobDone(job.jobId, {
      attempted: true,
      status: 'queued',
      sessionId: 'session-a',
      sessionIdB: 'session-b',
      projectUuidA: 'project-a',
      projectUuidB: 'project-b',
      projectUrlA: 'https://www.liblib.tv/canvas?projectId=project-a',
      projectUrlB: 'https://www.liblib.tv/canvas?projectId=project-b',
    })

    const serialized = serializeLibtvAdJob(getLibtvAdJob(job.jobId)!)
    assert.equal(serialized.status, 'done')
    assert.equal(serialized.result?.sessionId, 'session-a')
    assert.equal(serialized.result?.sessionIdB, 'session-b')
    assert.equal(analysis.sessionId, '')
    assert.equal(analysis.libtv, undefined)
  })

  it('returns a jobId immediately from the create route and accepts the AI recommendation as input', async () => {
    const response = await createLibtvAdRoute(new Request('https://example.com/api/generate-libtv-ad', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ analysis: makeAnalysisResult() }),
    }))

    assert.equal(response.status, 202)
    const body = await response.json()
    assert.equal(typeof body.jobId, 'string')
    assert.equal(body.status, 'pending')
    assert.equal(body.stage, 'queued')
  })

  it('lets the Libtv job status route report pending/done without using generate-ad jobs', async () => {
    const job = createLibtvAdJob({ analysis: makeAnalysisResult() })

    const pending = await getLibtvAdJobRoute(new Request(`https://example.com/api/generate-libtv-ad/${job.jobId}`), { params: Promise.resolve({ jobId: job.jobId }) })
    assert.equal(pending.status, 200)
    assert.equal((await pending.json()).status, 'pending')

    markLibtvAdJobDone(job.jobId, { attempted: true, status: 'not-configured', error: 'missing key' })
    const done = await getLibtvAdJobRoute(new Request(`https://example.com/api/generate-libtv-ad/${job.jobId}`), { params: Promise.resolve({ jobId: job.jobId }) })
    const body = await done.json()
    assert.equal(body.status, 'done')
    assert.equal(body.result.status, 'not-configured')
  })
})
