import type { GenerateAdResponse, VideoFrameInput } from '../types'

export interface GenerateAdJobInput {
  blobUrl: string
  frames: VideoFrameInput[]
  userPreferences: unknown
}

export type GenerateAdJob = {
  jobId: string
  createdAt: number
  updatedAt: number
  stage: GenerateAdJobStage
  input: GenerateAdJobInput
} & (
  | { status: 'pending'; result?: never; error?: never }
  | { status: 'done'; result: GenerateAdResponse; error?: never }
  | { status: 'error'; result?: never; error: string }
)

type GenerateAdJobMap = Map<string, GenerateAdJob>

export type GenerateAdJobStage = 'queued' | 'preparing_media' | 'calling_ai' | 'calling_kimi' | 'done' | 'error'

const globalForGenerateAdJobs = globalThis as typeof globalThis & {
  __addramaGenerateAdJobs?: GenerateAdJobMap
}

const jobs = globalForGenerateAdJobs.__addramaGenerateAdJobs ?? new Map<string, GenerateAdJob>()
globalForGenerateAdJobs.__addramaGenerateAdJobs = jobs

function makeJobId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}

export function createGenerateAdJob(input: GenerateAdJobInput): GenerateAdJob {
  const now = Date.now()
  const job: GenerateAdJob = {
    jobId: makeJobId(),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    stage: 'queued',
    input,
  }
  jobs.set(job.jobId, job)
  return job
}

export function getGenerateAdJob(jobId: string): GenerateAdJob | undefined {
  return jobs.get(jobId)
}

export function updateGenerateAdJobStage(jobId: string, stage: GenerateAdJobStage): GenerateAdJob | undefined {
  const existing = jobs.get(jobId)
  if (!existing || existing.status !== 'pending') return existing
  const updated: GenerateAdJob = {
    ...existing,
    stage,
    updatedAt: Date.now(),
  }
  jobs.set(jobId, updated)
  return updated
}

export function markGenerateAdJobDone(jobId: string, result: GenerateAdResponse): GenerateAdJob | undefined {
  const existing = jobs.get(jobId)
  if (!existing) return undefined
  const updated: GenerateAdJob = {
    jobId,
    status: 'done',
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
    stage: 'done',
    input: existing.input,
    result,
  }
  jobs.set(jobId, updated)
  return updated
}

export function markGenerateAdJobError(jobId: string, error: string): GenerateAdJob | undefined {
  const existing = jobs.get(jobId)
  if (!existing) return undefined
  const updated: GenerateAdJob = {
    jobId,
    status: 'error',
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
    stage: 'error',
    input: existing.input,
    error,
  }
  jobs.set(jobId, updated)
  return updated
}

export function serializeGenerateAdJob(job: GenerateAdJob) {
  if (job.status === 'done') {
    return { jobId: job.jobId, status: job.status, stage: job.stage, updatedAt: job.updatedAt, result: job.result }
  }
  if (job.status === 'error') {
    return { jobId: job.jobId, status: job.status, stage: job.stage, updatedAt: job.updatedAt, error: job.error }
  }
  return { jobId: job.jobId, status: job.status, stage: job.stage, updatedAt: job.updatedAt }
}

export function resetGenerateAdJobs(): void {
  jobs.clear()
}
