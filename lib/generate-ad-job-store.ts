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
  input: GenerateAdJobInput
} & (
  | { status: 'pending'; result?: never; error?: never }
  | { status: 'done'; result: GenerateAdResponse; error?: never }
  | { status: 'error'; result?: never; error: string }
)

type GenerateAdJobMap = Map<string, GenerateAdJob>

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
    input,
  }
  jobs.set(job.jobId, job)
  return job
}

export function getGenerateAdJob(jobId: string): GenerateAdJob | undefined {
  return jobs.get(jobId)
}

export function markGenerateAdJobDone(jobId: string, result: GenerateAdResponse): GenerateAdJob | undefined {
  const existing = jobs.get(jobId)
  if (!existing) return undefined
  const updated: GenerateAdJob = {
    jobId,
    status: 'done',
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
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
    input: existing.input,
    error,
  }
  jobs.set(jobId, updated)
  return updated
}

export function serializeGenerateAdJob(job: GenerateAdJob) {
  if (job.status === 'done') {
    return { jobId: job.jobId, status: job.status, result: job.result }
  }
  if (job.status === 'error') {
    return { jobId: job.jobId, status: job.status, error: job.error }
  }
  return { jobId: job.jobId, status: job.status }
}

export function resetGenerateAdJobs(): void {
  jobs.clear()
}
