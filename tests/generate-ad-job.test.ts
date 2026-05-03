import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { createGenerateAdJob, getGenerateAdJob, markGenerateAdJobDone, markGenerateAdJobError, resetGenerateAdJobs } from '../lib/generate-ad-job-store'
import { POST as createGenerateAdRoute } from '../app/api/generate-ad/route'
import { GET as getGenerateAdJobRoute } from '../app/api/generate-ad/[jobId]/route'

describe('generate-ad async job flow', () => {
  beforeEach(() => {
    resetGenerateAdJobs()
  })

  it('creates a pending job record with a unique jobId', () => {
    const job = createGenerateAdJob({ blobUrl: 'https://blob.example/video.mp4', frames: [], userPreferences: null })

    assert.equal(job.status, 'pending')
    assert.equal(typeof job.jobId, 'string')
    assert.ok(job.jobId.length > 0)
    assert.equal(getGenerateAdJob(job.jobId)?.status, 'pending')
  })

  it('marks a job as done and stores the generated response payload', () => {
    const job = createGenerateAdJob({ blobUrl: 'https://blob.example/video.mp4', frames: [], userPreferences: null })

    markGenerateAdJobDone(job.jobId, {
      sessionId: 'session-a',
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
    })

    const updated = getGenerateAdJob(job.jobId)
    assert.equal(updated?.status, 'done')
    assert.equal(updated?.result?.sessionId, 'session-a')
  })

  it('marks a job as error and exposes the failure reason', () => {
    const job = createGenerateAdJob({ blobUrl: 'https://blob.example/video.mp4', frames: [], userPreferences: null })

    markGenerateAdJobError(job.jobId, 'Kimi error: timeout')

    const updated = getGenerateAdJob(job.jobId)
    assert.equal(updated?.status, 'error')
    assert.equal(updated?.error, 'Kimi error: timeout')
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
})
