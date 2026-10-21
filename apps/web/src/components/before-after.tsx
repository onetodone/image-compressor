'use client'

import Image from 'next/image'
import { useState } from 'react'

interface BeforeAfterProps {
  /** Original image, e.g. an object URL of the picked file. */
  before: string
  /** Compressed image, or `null` when no preview exists. */
  after: string | null
  width: number | null
  height: number | null
}

export function BeforeAfter({ before, after, width, height }: BeforeAfterProps) {
  const [position, setPosition] = useState(50)
  const aspectRatio = width && height ? `${width} / ${height}` : '4 / 3'

  return (
    <figure className="flex flex-col gap-2">
      <div
        className="relative max-h-[28rem] w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900"
        style={{ aspectRatio }}
      >
        <Image src={before} alt="Original" fill sizes="(min-width: 768px) 720px, 100vw" className="object-contain" />
        {after && (
          <>
            <Image
              src={after}
              alt="Compressed"
              fill
              sizes="(min-width: 768px) 720px, 100vw"
              className="object-contain"
              style={{ clipPath: `inset(0 0 0 ${position}%)` }}
            />
            <div aria-hidden className="absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${position}%` }} />
            <input
              type="range"
              min={0}
              max={100}
              value={position}
              onChange={(event) => setPosition(Number(event.target.value))}
              aria-label="Compare original and compressed"
              className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
            />
          </>
        )}
      </div>
      <figcaption className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>Original</span>
        {after && <span>Compressed</span>}
      </figcaption>
    </figure>
  )
}
