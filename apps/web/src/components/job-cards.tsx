'use client'

import type { JobStatus, JobSummary } from '@onetodone/image-compressor-shared'
import type { ReactNode } from 'react'

import { BeforeAfter } from '@/components/before-after'
import { useLiveJob } from '@/hooks/use-live-job'
import type { Upload } from '@/hooks/use-uploads'
import { formatBytes, savedPercent } from '@/lib/files'

const STATUS_LABELS: Record<JobStatus, string> = {
  awaiting_upload: 'Not uploaded',
  queued: 'Queued',
  processing: 'Compressing…',
  done: 'Done',
  failed: 'Failed',
}

const UPLOAD_LABELS: Record<Exclude<Upload['stage'], 'submitted' | 'rejected' | 'error'>, string> = {
  creating: 'Preparing…',
  uploading: 'Uploading…',
  submitting: 'Queuing…',
}

function Card({ name, children }: { name: string; children: ReactNode }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="truncate text-sm font-medium" title={name}>
        {name}
      </h3>
      {children}
    </article>
  )
}

function Problem({ children }: { children: ReactNode }) {
  return <p className="text-sm text-red-600 dark:text-red-400">{children}</p>
}

function Progress({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value === null ? undefined : Math.round(value * 100)}
        className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div
          className={`h-full rounded-full bg-emerald-500 transition-[width] ${value === null ? 'w-1/3 animate-pulse' : ''}`}
          style={value === null ? undefined : { width: `${value * 100}%` }}
        />
      </div>
    </div>
  )
}

function Result({ job }: { job: JobSummary }) {
  if (job.inputBytes === null || job.outputBytes === null) return null
  const percent = savedPercent(job.inputBytes, job.outputBytes)
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
      <span className="tabular-nums">
        {formatBytes(job.inputBytes)} → {formatBytes(job.outputBytes)}
      </span>
      {percent > 0 ? (
        <span className="font-medium text-emerald-600 dark:text-emerald-400">{percent}% smaller</span>
      ) : (
        <span className="text-zinc-500 dark:text-zinc-400">Already optimized, kept as is</span>
      )}
      {job.width && job.height && (
        <span className="text-zinc-500 dark:text-zinc-400">
          {job.width}×{job.height}
        </span>
      )}
    </p>
  )
}

function JobState({ job, liveError }: { job: JobSummary; liveError: string | null }) {
  if (job.status === 'done') return <Result job={job} />
  if (job.status === 'failed') return <Problem>{job.error ?? 'The image could not be compressed.'}</Problem>
  if (job.status === 'awaiting_upload') {
    return <span className="text-sm text-zinc-500 dark:text-zinc-400">{STATUS_LABELS[job.status]}</span>
  }
  return (
    <>
      <Progress label={STATUS_LABELS[job.status]} value={null} />
      {liveError && <Problem>{liveError}</Problem>}
    </>
  )
}

/** A file picked in this session: upload progress, then the live job with a before/after view. */
export function UploadCard({ upload }: { upload: Upload }) {
  const { job, error } = useLiveJob(upload.stage === 'submitted' ? upload.jobId : null)

  let body: ReactNode
  if (upload.stage === 'rejected' || upload.stage === 'error') body = <Problem>{upload.error}</Problem>
  else if (upload.stage !== 'submitted') {
    body = (
      <Progress label={UPLOAD_LABELS[upload.stage]} value={upload.stage === 'uploading' ? upload.progress : null} />
    )
  } else if (!job) body = <Progress label={STATUS_LABELS.queued} value={null} />
  else body = <JobState job={job} liveError={error} />

  return (
    <Card name={upload.name}>
      {body}
      {job?.status === 'done' && upload.objectUrl && (
        <BeforeAfter before={upload.objectUrl} after={job.previewUrl} width={job.width} height={job.height} />
      )}
    </Card>
  )
}

/** A job from an earlier visit, followed live while it is still running. */
export function HistoryCard({ initial }: { initial: JobSummary }) {
  const { job, error } = useLiveJob(initial.id, initial)
  const current = job ?? initial
  return (
    <Card name={current.originalName}>
      <JobState job={current} liveError={error} />
    </Card>
  )
}
