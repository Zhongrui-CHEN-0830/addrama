import { createHash } from 'node:crypto'
import { get as getBlob, put as putBlob } from '@vercel/blob'
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
  __addramaGenerateAdCompletedJobs?: GenerateAdJobMap
}

const jobs = globalForGenerateAdJobs.__addramaGenerateAdJobs ?? new Map<string, GenerateAdJob>()
const completedJobs = globalForGenerateAdJobs.__addramaGenerateAdCompletedJobs ?? new Map<string, GenerateAdJob>()
globalForGenerateAdJobs.__addramaGenerateAdJobs = jobs
globalForGenerateAdJobs.__addramaGenerateAdCompletedJobs = completedJobs

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return `{${Object.keys(obj).sort().map(key => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function makeGenerateAdJobId(input: GenerateAdJobInput): string {
  return createHash('sha256').update(stableStringify(input)).digest('hex').slice(0, 32)
}

function completedJobPath(jobId: string): string {
  return `addrama/generate-ad-results/${jobId}.json`
}

function isBlobPersistenceConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim())
}

async function persistCompletedGenerateAdJob(job: GenerateAdJob): Promise<void> {
  completedJobs.set(job.jobId, job)
  if (job.status !== 'done' || !isBlobPersistenceConfigured()) return

  try {
    await putBlob(completedJobPath(job.jobId), JSON.stringify(job), {
      access: 'public',
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 60,
    })
  } catch (err) {
    console.error('[generate-ad] failed to persist completed job:', err)
  }
}

function parsePersistedGenerateAdJob(value: unknown, jobId: string): GenerateAdJob | undefined {
  if (!value || typeof value !== 'object') return undefined
  const job = value as Partial<GenerateAdJob>
  if (job.jobId !== jobId || job.status !== 'done' || job.stage !== 'done') return undefined
  if (!job.input || !job.result || typeof job.createdAt !== 'number' || typeof job.updatedAt !== 'number') return undefined
  return job as GenerateAdJob
}

export async function recoverGenerateAdJob(jobId: string): Promise<GenerateAdJob | undefined> {
  const inMemory = jobs.get(jobId) ?? completedJobs.get(jobId)
  if (inMemory) return inMemory
  if (!isBlobPersistenceConfigured()) return undefined

  try {
    const persisted = await getBlob(completedJobPath(jobId), { access: 'public', useCache: false })
    if (!persisted || persisted.statusCode !== 200) return undefined

    const text = await new Response(persisted.stream).text()
    const job = parsePersistedGenerateAdJob(JSON.parse(text), jobId)
    if (job) {
      jobs.set(jobId, job)
      completedJobs.set(jobId, job)
    }
    return job
  } catch (err) {
    console.error('[generate-ad] failed to recover completed job:', err)
    return undefined
  }
}

export function createGenerateAdJob(input: GenerateAdJobInput): GenerateAdJob {
  const jobId = makeGenerateAdJobId(input)
  const existing = jobs.get(jobId) ?? completedJobs.get(jobId)
  if (existing) return existing

  const now = Date.now()
  const job: GenerateAdJob = {
    jobId,
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
  return jobs.get(jobId) ?? completedJobs.get(jobId)
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
  void persistCompletedGenerateAdJob(updated)
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

export function resetPersistedGenerateAdJobsForTests(): void {
  completedJobs.clear()
}
