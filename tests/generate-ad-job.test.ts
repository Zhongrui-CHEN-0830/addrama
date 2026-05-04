import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'

import { createGenerateAdJob, getGenerateAdJob, markGenerateAdJobDone, markGenerateAdJobError, resetGenerateAdJobs, resetPersistedGenerateAdJobsForTests, serializeGenerateAdJob, updateGenerateAdJobStage } from '../lib/generate-ad-job-store'
import { isUnknownGenerateAdJobError } from '../lib/ad-result'
import { runGenerateAdJob } from '../lib/generate-ad-worker'
import { POST as createGenerateAdRoute } from '../app/api/generate-ad/route'
import { GET as getGenerateAdJobRoute } from '../app/api/generate-ad/[jobId]/route'
import type { GenerateAdResponse } from '../types'

function makeAnalysisResult(overrides: Partial<GenerateAdResponse> = {}): GenerateAdResponse {
  return {
    sessionId: '',
    adCopyA: '广告A',
    adCopyB: '广告B',
    videoPromptA: 'prompt A',
    videoPromptB: 'prompt B',
    interactiveQuestion: '看一看？',
    fifteenSecScript: '0-3s intro',
    adFormat: 'buffer-card',
    adFormatReason: 'reason',
    sceneAnalysis: {
      sceneType: '转场',
      emotionScore: 20,
      tags: ['转场'],
      advertisingRisk: 'low',
      recommendedAdType: 'buffer-card',
      reasoning: '好时机',
    },
    rhythmTimeline: { segments: [], recommendedInsertPoints: [] },
    ...overrides,
  }
}

describe('generate-ad async job flow', () => {
  beforeEach(() => {
    resetGenerateAdJobs()
    resetPersistedGenerateAdJobsForTests()
  })

  it('creates a pending job record with a unique jobId', () => {
    const job = createGenerateAdJob({ blobUrl: 'https://blob.example/video.mp4', frames: [], userPreferences: null })

    assert.equal(job.status, 'pending')
    assert.equal(typeof job.jobId, 'string')
    assert.ok(job.jobId.length > 0)
    assert.equal(getGenerateAdJob(job.jobId)?.status, 'pending')
  })

  it('marks a job as done and stores the AI-only recommendation payload without Libtv sessions', () => {
    const job = createGenerateAdJob({ blobUrl: 'https://blob.example/video.mp4', frames: [], userPreferences: null })

    markGenerateAdJobDone(job.jobId, makeAnalysisResult())

    const updated = getGenerateAdJob(job.jobId)
    assert.equal(updated?.status, 'done')
    assert.equal(updated?.result?.sessionId, '')
    assert.equal(updated?.result?.sessionIdB, undefined)
    assert.equal(updated?.result?.libtv?.attempted ?? false, false)
  })

  it('persists completed jobs by stable input key so a serverless instance without memory can recover Kimi success instead of 404/pending forever', () => {
    const input = { blobUrl: 'https://blob.example/video.mp4', frames: [], userPreferences: null }
    const job = createGenerateAdJob(input)
    const result = makeAnalysisResult({ adCopyA: 'Kimi 成功结果' })
    markGenerateAdJobDone(job.jobId, result)

    resetGenerateAdJobs()

    const stableJobId = createHash('sha256').update(JSON.stringify(input)).digest('hex').slice(0, 32)
    const recovered = getGenerateAdJob(stableJobId)
    assert.equal(recovered?.status, 'done')
    assert.equal(recovered?.stage, 'done')
    assert.equal(recovered?.result?.adCopyA, 'Kimi 成功结果')
    assert.equal(serializeGenerateAdJob(recovered!).jobId, stableJobId)
  })

  it('marks a job as error and exposes the failure reason', () => {
    const job = createGenerateAdJob({ blobUrl: 'https://blob.example/video.mp4', frames: [], userPreferences: null })

    markGenerateAdJobError(job.jobId, 'Kimi error: timeout')

    const updated = getGenerateAdJob(job.jobId)
    assert.equal(updated?.status, 'error')
    assert.equal(updated?.error, 'Kimi error: timeout')
  })

  it('exposes stage and updatedAt diagnostics while a job is still pending', () => {
    const job = createGenerateAdJob({ blobUrl: 'https://blob.example/video.mp4', frames: [], userPreferences: null })

    updateGenerateAdJobStage(job.jobId, 'calling_ai')
    const state = getGenerateAdJob(job.jobId)

    assert.equal(state?.status, 'pending')
    assert.equal(state?.stage, 'calling_ai')
    assert.equal(typeof state?.updatedAt, 'number')
    assert.ok((state?.updatedAt ?? 0) >= job.updatedAt)
  })

  it('marks the job as error when the worker throws so polling does not stay pending forever', async () => {
    const job = createGenerateAdJob({ blobUrl: 'https://blob.invalid/video.mp4', frames: [], userPreferences: null })

    await runGenerateAdJob(job.jobId, job.input)

    const state = getGenerateAdJob(job.jobId)
    assert.equal(state?.status, 'error')
    assert.equal(state?.stage, 'error')
    assert.match(state?.error ?? '', /fetch failed|ENOTFOUND|AI 分析失败|AI provider error|HTTP|API key|required/i)
  })

  it('returns a jobId immediately from the create route instead of waiting for analysis to finish', async () => {
    const response = await createGenerateAdRoute(new Request('https://example.com/api/generate-ad', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        blobUrl: 'https://blob.example/video.mp4',
        frames: [],
        userPreferences: null,
      }),
    }))

    assert.equal(response.status, 202)
    const body = await response.json()
    assert.equal(typeof body.jobId, 'string')
    assert.equal(body.status, 'pending')
  })

  it('lets the job status route report pending before the analysis worker finishes', async () => {
    const job = createGenerateAdJob({ blobUrl: 'https://blob.example/video.mp4', frames: [], userPreferences: null })

    const response = await getGenerateAdJobRoute(new Request(`https://example.com/api/generate-ad/${job.jobId}`), {
      params: Promise.resolve({ jobId: job.jobId }),
    })

    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.status, 'pending')
    assert.equal(body.jobId, job.jobId)
  })

  it('classifies a missing job lookup as stale so the UI can resubmit instead of showing unknown jobId', async () => {
    const response = await getGenerateAdJobRoute(new Request('https://example.com/api/generate-ad/stale-job-id'), {
      params: Promise.resolve({ jobId: 'stale-job-id' }),
    })

    assert.equal(response.status, 404)
    const body = await response.json()
    assert.equal(isUnknownGenerateAdJobError(body), true)
  })
})
