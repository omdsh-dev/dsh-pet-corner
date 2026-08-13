/**
 * Pet Corner client plugin: the pet itself is the surface — a floating,
 * draggable cat avatar mounted on its own React root (default on, no session
 * or view required). Clicking it opens the picture panel fed by the preload
 * pool; the settings section owns the durable preferences. All upstream media
 * travels through the host proxy.
 */

import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { en, NS, zh } from './locales.ts'
import { createPetFavorites } from './store.ts'
import { PetPool } from './preload.ts'
import { FloatPet } from './FloatPet.tsx'
import { SettingsSection, type SettingsSectionInjected } from './SettingsSection.tsx'
import { HttpPetSettingsClient } from './settings-client.ts'

export type { FloatPetProps } from './FloatPet.tsx'
export type { PetPanelProps } from './PetPanel.tsx'
export type { SettingsSectionInjected, SettingsSectionProps } from './SettingsSection.tsx'
export type { FavoriteKind, FavoritePet, PetFavorites, PetFavoritesState } from './store.ts'
export type { PetPool, PooledPet } from './preload.ts'
export type { PetSettings } from '../pet-settings.ts'

/**
 * Required services: the slot registry and locale dictionaries. Durable
 * preferences use the plugin-owned loopback settings endpoint.
 */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: register the settings section and mount the always-alive
 * floating pet root. Upstream media remains lazy until the user opens it.
 * @param ctx - client cordis context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'pet-corner: dictionaries')
  const t = ctx.locale.bind(NS)
  const scope = new HttpPetSettingsClient()
  ctx.effect(() => () => { scope.dispose() }, 'pet-corner: settings client')
  const refresh = (): void => { void scope.refresh().catch(() => {}) }
  ctx.effect(() => {
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, 'pet-corner: settings refresh')
  const favorites = createPetFavorites()
  const pool = new PetPool(() => scope.getSnapshot().value)

  // Settings section (root scope; the shell supplies the `close` owner prop).
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'pet-corner',
    order: 30,
    label: () => t('settings.nav'),
    locale: NS,
    inject: (): SettingsSectionInjected => ({ scope }),
  }, SettingsSection))

  // The pet: independent React root on document.body so it lives outside any
  // session view; unmounted (and DOM removed) with the plugin fiber.
  ctx.effect(() => {
    const holder = document.createElement('div')
    holder.dataset.plugin = 'dsh-pet-corner'
    ;(document.body ?? document.documentElement).appendChild(holder)
    const root = createRoot(holder)
    root.render(createElement(FloatPet, { scope, favorites, pool, t }))
    return () => {
      root.unmount()
      holder.remove()
    }
  }, 'pet-corner: floating pet root')
}
