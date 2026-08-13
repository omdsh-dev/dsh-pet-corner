/** Browser-side reactive client for Pet Corner's plugin-owned settings API. */
import {
  DEFAULT_PET_SETTINGS, PetSettingsSchema, type PetSettings,
} from '../pet-settings.ts'
import { PET_SETTINGS_API_PATH } from '../settings-api.ts'

export interface PetSettingsSnapshot {
  value: PetSettings
  loading: boolean
  error: string | null
}

export interface PetSettingsClient {
  getSnapshot(): PetSettingsSnapshot
  subscribe(listener: () => void): () => void
  set<K extends keyof PetSettings>(field: K, value: PetSettings[K]): Promise<void>
  refresh(): Promise<void>
}

export class HttpPetSettingsClient implements PetSettingsClient {
  private snapshot: PetSettingsSnapshot = {
    value: { ...DEFAULT_PET_SETTINGS, sources: [...DEFAULT_PET_SETTINGS.sources] },
    loading: true,
    error: null,
  }
  private readonly listeners = new Set<() => void>()
  private readonly abort = new AbortController()
  private writeTail: Promise<void> = Promise.resolve()
  private disposed = false

  constructor() {
    void this.refresh().catch(() => {})
  }

  getSnapshot = (): PetSettingsSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  async refresh(): Promise<void> {
    if (this.disposed) return
    try {
      const settings = await requestSettings('GET', undefined, this.abort.signal)
      this.commit(settings, false, null)
    } catch (error) {
      if (this.abort.signal.aborted) return
      this.commit(this.snapshot.value, false, error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  set<K extends keyof PetSettings>(field: K, value: PetSettings[K]): Promise<void> {
    const operation = this.writeTail.then(async () => {
      const previous = this.snapshot.value
      const optimistic = PetSettingsSchema({ ...previous, [field]: value })
      this.commit(optimistic, false, null)
      try {
        const settings = await requestSettings('PATCH', { [field]: value }, this.abort.signal)
        this.commit(settings, false, null)
      } catch (error) {
        this.commit(previous, false, error instanceof Error ? error.message : String(error))
        throw error
      }
    })
    this.writeTail = operation.catch(() => {})
    return operation
  }

  dispose(): void {
    this.disposed = true
    this.abort.abort()
    this.listeners.clear()
  }

  private commit(value: PetSettings, loading: boolean, error: string | null): void {
    this.snapshot = {
      value: { ...value, sources: [...value.sources] },
      loading,
      error,
    }
    for (const listener of [...this.listeners]) listener()
  }
}

async function requestSettings(
  method: 'GET' | 'PATCH',
  patch: Partial<PetSettings> | undefined,
  signal: AbortSignal,
): Promise<PetSettings> {
  const response = await fetch(PET_SETTINGS_API_PATH, {
    method,
    headers: method === 'PATCH' ? { 'content-type': 'application/json' } : undefined,
    body: patch === undefined ? undefined : JSON.stringify({ patch }),
    signal,
  })
  const body = await response.json() as { settings?: unknown; message?: unknown }
  if (!response.ok) throw new Error(typeof body.message === 'string' ? body.message : `settings API answered ${response.status}`)
  return PetSettingsSchema(body.settings as PetSettings)
}
