/**
 * Pet Corner host registration: the durable settings namespace and the
 * whitelisted upstream proxy route. The browser half (src/client) is a
 * separate entry; the client bundle only ever requests the same-origin
 * `/plugins/dsh-pet-corner/api/…` route registered here.
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { PET_SETTINGS_NAMESPACE, PetSettingsSchema } from './pet-settings.ts'
import { handlePetApi, PET_API_PREFIX } from './proxy.ts'

export { PET_SETTINGS_NAMESPACE, type PetSettings } from './pet-settings.ts'

/** Stable Cordis plugin name. */
export const name = 'pet-corner'

/** Services required before settings and the proxy route can register. */
export const inject = ['settings', 'webServer']

/**
 * Host plugin body: register the `pet-corner` settings namespace and claim
 * the `/plugins/dsh-pet-corner/api` prefix route on the webserver.
 * @param ctx - host cordis context.
 */
export function apply(ctx: Context): void {
  const settings = ctx.settings.register(settingsNamespace(PET_SETTINGS_NAMESPACE), PetSettingsSchema)
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'prefix',
      path: PET_API_PREFIX,
      handler: (req, res) => handlePetApi(req, res, settings),
    }),
    'pet-corner: upstream proxy route',
  )
}
