/**
 * Durable Pet Corner preferences shared by the Host schema registration and
 * the browser settings scope. Client bundles inline schemastery (vendored
 * library) so this file stays importable from both faces; the settings
 * namespace itself is registered Host-side by the plugin entry.
 */

import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by the pet-corner plugin. */
export const PET_SETTINGS_NAMESPACE = 'pet-corner'

/** Same-origin package image used whenever a whitelisted upstream is unavailable. */
export const PET_FALLBACK_IMAGE_URL = '/plugins/dsh-pet-corner/api/fallback/cat_idle.png'

/** Picture sources the user allows into the random pool. */
export const PET_SOURCES = ['cat', 'dog', 'fox', 'facts'] as const

/** One allowed picture source (facts = the Cat Facts caption line). */
export type PetSource = typeof PET_SOURCES[number]

/** Auto-refresh cadence choices for the view's picture. */
export const PET_AUTO_INTERVALS = ['off', '5min', '30min'] as const

/** One auto-refresh cadence. */
export type PetAutoInterval = typeof PET_AUTO_INTERVALS[number]

/** Durable settings section persisted in the Host user-settings document. */
export interface PetSettings {
  /** Whether the floating corner widget is visible. */
  widgetEnabled: boolean
  /** Enabled picture sources for the random pool (all mode + widget). */
  sources: PetSource[]
  /** Default dog breed for the dog filter (empty = any breed). */
  defaultBreed: string
  /** Auto-refresh cadence (off = never). */
  autoInterval: PetAutoInterval
}

/** Durable settings schema; also the wire envelope the browser scope validates against. */
export const PetSettingsSchema: z<PetSettings> = z.object({
  widgetEnabled: z.boolean().default(true),
  sources: z.array(z.union([...PET_SOURCES])).default([...PET_SOURCES]),
  defaultBreed: z.string().default(''),
  autoInterval: z.union([...PET_AUTO_INTERVALS]).default('off'),
})

/** Default resolved section (mirrors the schema defaults for the no-scope case). */
export const DEFAULT_PET_SETTINGS: PetSettings = {
  widgetEnabled: true,
  sources: [...PET_SOURCES],
  defaultBreed: '',
  autoInterval: 'off',
}
