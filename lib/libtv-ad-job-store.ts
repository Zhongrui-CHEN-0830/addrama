import type { GenerateAdResponse } from '../types'

export interface LibtvAdJobInput {
  analysis: GenerateAdResponse
}

export interface LibtvAdJobResult {
  attempted: boolean
  status: 'not-configured' | 'queued' | 'error'
  error?: string
  sessionId?: string
  sessionIdB?: string
  projectUuidA?: string
  projectUuidB?: string
  projectUrlA?: string
  projectUrlB?: string
}

export type LibtvAdJobStage = 'queued' | 'building_libtv_message' | 'creating_libtv_session_a' | 'creating_libtv_session_b' | 'done' | 'error'

export type LibtvAdJob = {
  jobId: string
  createdAt: number
  updatedAt: number
  stage: LibtvAdJobStage
  input: LibtvAdJobInput
} & (
  | { status: 'pending'; result?: never; error?: never }
  | { status: 'done'; result: LibtvAdJobResult; error?: never }
  | { status: 'error'; result?: never; error: string }
)

type LibtvAdJobMap = Map<string, LibtvAdJob>

const globalForLibtvAdJobs = globalThis as typeof globalThis & {
  __addramaLibtvAdJobs?: LibtvAdJobMap
}

const jobs = globalForLibtvAdJobs.__addramaLibtvAdJobs ?? new Map<string, LibtvAdJob>()
globalForLibtvAdJobs.__addramaLibtvAdJobs = jobs

function makeJobId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `libtv_job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}

export function createLibtvAdJob(input: LibtvAdJobInput): LibtvAdJob {
  const now = Date.now()
  const job: LibtvAdJob = {
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

export function getLibtvAdJob(jobId: string): LibtvAdJob | undefined {
  return jobs.get(jobId)
}

export function updateLibtvAdJobStage(jobId: string, stage: LibtvAdJobStage): LibtvAdJob | undefined {
  const existing = jobs.get(jobId)
  if (!existing || existing.status !== 'pending') return existing
  const updated: LibtvAdJob = { ...existing, stage, updatedAt: Date.now() }
  jobs.set(jobId, updated)
  return updated
}

export function markLibtvAdJobDone(jobId: string, result: LibtvAdJobResult): LibtvAdJob | undefined {
  const existing = jobs.get(jobId)
  if (!existing) return undefined
  const updated: LibtvAdJob = {
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

export function markLibtvAdJobError(jobId: string, error: string): LibtvAdJob | undefined {
  const existing = jobs.get(jobId)
  if (!existing) return undefined
  const updated: LibtvAdJob = {
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

export function serializeLibtvAdJob(job: LibtvAdJob) {
  if (job.status === 'done') return { jobId: job.jobId, status: job.status, stage: job.stage, updatedAt: job.updatedAt, result: job.result }
  if (job.status === 'error') return { jobId: job.jobId, status: job.status, stage: job.stage, updatedAt: job.updatedAt, error: job.error }
  return { jobId: job.jobId, status: job.status, stage: job.stage, updatedAt: job.updatedAt }
}

export function resetLibtvAdJobs(): void {
  jobs.clear()
}
