import type { Quota } from '@onetodone/image-compressor-shared'

export function QuotaMeter({ quota }: { quota: Quota }) {
  const left = Math.max(quota.limit - quota.used, 0)
  const usedShare = Math.min(quota.used / quota.limit, 1)
  return (
    <div className="flex min-w-40 flex-col gap-1.5 text-right" aria-live="polite">
      <span className="text-sm">
        <span className="font-medium tabular-nums">{left}</span> of {quota.limit} images left today
      </span>
      <div
        role="meter"
        aria-label="Images used today"
        aria-valuemin={0}
        aria-valuemax={quota.limit}
        aria-valuenow={quota.used}
        className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div
          className={`h-full rounded-full ${left === 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
          style={{ width: `${usedShare * 100}%` }}
        />
      </div>
    </div>
  )
}
