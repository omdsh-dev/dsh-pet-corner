/**
 * Picture preload pool: keeps a small queue of ready-to-show pet pictures as
 * blob URLs, fetched in the background through the host proxy. "New one" pops
 * from the queue instantly (no network round-trip) and a refill fetch starts
 * behind it — the pet never sits on a loading skeleton once the pool is warm.
 * The pool warms at plugin apply and refills after every take.
 */

import type { PetSettings } from '../pet-settings.ts'
import type { FavoriteKind } from './store.ts'
import { catUrl, dogUrl, fetchJson, foxUrl, imgUrl, type DogImageReply, type FoxReply } from './api.ts'

/** How many ready pictures the pool keeps. */
const POOL_SIZE = 5

/** One ready picture. */
export interface PooledPet {
  kind: FavoriteKind
  /** Blob object URL — renders instantly, no network. */
  url: string
  /** The proxied same-origin URL the blob came from (persistable, cache-backed). */
  sourceUrl: string
}

/** Fetch one URL through the proxy and convert it into a blob object URL. */
async function toBlobUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

/**
 * Background refill source: fetch one random enabled-kind picture as a blob.
 * @returns the pooled pet, or null when the fetch failed or every source is disabled.
 */
async function fetchOne(getSettings: () => PetSettings): Promise<PooledPet | null> {
  const settings = getSettings()
  const enabled = (['cat', 'dog', 'fox'] as const).filter(source => settings.sources.includes(source))
  if (enabled.length === 0) return null
  const kind = enabled[Math.floor(Math.random() * enabled.length)] ?? 'cat'
  try {
    if (kind === 'cat') {
      const sourceUrl = catUrl()
      const url = await toBlobUrl(sourceUrl)
      return url === null ? null : { kind, url, sourceUrl }
    }
    if (kind === 'dog') {
      const reply = await fetchJson<DogImageReply>(dogUrl(settings.defaultBreed))
      const sourceUrl = imgUrl(reply.message)
      const url = await toBlobUrl(sourceUrl)
      return url === null ? null : { kind, url, sourceUrl }
    }
    const reply = await fetchJson<FoxReply>(foxUrl())
    const sourceUrl = imgUrl(reply.image)
    const url = await toBlobUrl(sourceUrl)
    return url === null ? null : { kind, url, sourceUrl }
  } catch {
    return null
  }
}

/** The preload pool: ready queue + concurrent background refill. */
export class PetPool {
  private readonly queue: PooledPet[] = []
  private pending: Promise<void> | null = null

  /**
   * @param getSettings - reads the live settings snapshot (sources/breed).
   */
  constructor(private readonly getSettings: () => PetSettings) {}

  /** Kick off the background warm-up; safe to call repeatedly. */
  warm(): Promise<void> {
    return this.refill()
  }

  /**
   * Pop the next ready picture, preferring `kind` when one is queued.
   * Items of currently disabled kinds are purged on the way. Triggers a
   * background refill for the vacancy.
   * @returns the pooled pet, or null while the pool is empty (caller falls back to a direct load).
   */
  take(kind?: FavoriteKind): PooledPet | null {
    const enabled = this.getSettings().sources
    const index = this.queue.findIndex(pet =>
      enabled.includes(pet.kind) && (kind === undefined || pet.kind === kind))
    if (index >= 0) {
      const [item] = this.queue.splice(index, 1)
      if (item !== undefined) {
        void this.refill()
        return item
      }
    }
    // Everything queued is disabled now (or the queue is empty): drop the
    // stale blobs and let the caller load directly for the current settings.
    if (this.queue.length > 0) {
      for (const pet of this.queue.splice(0)) this.release(pet.url)
      void this.refill()
    }
    return null
  }

  /** Release a blob URL the caller no longer renders (memory hygiene). */
  release(url: string): void {
    if (!url.startsWith('blob:')) return
    URL.revokeObjectURL(url)
  }

  /** Refill the queue up to {@link POOL_SIZE} with concurrent fetches. */
  private refill(): Promise<void> {
    if (this.pending !== null) return this.pending
    const need = POOL_SIZE - this.queue.length
    if (need <= 0) return Promise.resolve()
    this.pending = (async () => {
      try {
        const results = await Promise.all(Array.from({ length: need }, () => fetchOne(this.getSettings)))
        for (const result of results) {
          if (result !== null) this.queue.push(result)
        }
      } finally {
        this.pending = null
      }
    })()
    return this.pending
  }
}
