import { createServer, request as httpRequest } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { SettingsScope } from '@deepseek-ai/dsh-settings'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_PET_SETTINGS, PET_FALLBACK_IMAGE_URL, PetSettingsSchema, type PetSettings,
} from '../src/pet-settings.ts'
import { imgUrl } from '../src/client/api.ts'
import { handlePetApi, PET_API_PREFIX } from '../src/proxy.ts'
import { parsePetSettingsPatch, PET_SETTINGS_API_PATH } from '../src/settings-api.ts'

const servers: Array<ReturnType<typeof createServer>> = []
afterEach(async () => {
  vi.unstubAllGlobals()
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => { resolve() }))))
})

function memoryScope(): { scope: SettingsScope<PetSettings>; read: () => PetSettings } {
  let value = PetSettingsSchema(DEFAULT_PET_SETTINGS)
  return {
    read: () => value,
    scope: {
      get: () => value,
      watch: () => () => {},
      update: async (patch) => { value = PetSettingsSchema({ ...value, ...patch }) },
      replace: async (section) => { value = PetSettingsSchema(section as PetSettings) },
    },
  }
}

async function mounted() {
  const state = memoryScope()
  const server = createServer((req, res) => { void handlePetApi(req, res, state.scope) })
  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as AddressInfo).port
  return { ...state, port, base: `http://127.0.0.1:${port}` }
}

async function localGet(port: number, path: string, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: Buffer }>((resolve, reject) => {
    const req = httpRequest({ host: '127.0.0.1', port, path, headers }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', chunk => { chunks.push(Buffer.from(chunk)) })
      res.on('end', () => {
        resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) })
      })
    })
    req.on('error', reject)
    req.end()
  })
}

describe('pet settings API', () => {
  it('validates known partial fields and rejects unknown keys', () => {
    expect(parsePetSettingsPatch({ widgetEnabled: false, sources: ['cat'] }, DEFAULT_PET_SETTINGS))
      .toEqual({ widgetEnabled: false, sources: ['cat'] })
    expect(() => parsePetSettingsPatch({ secretPath: '/tmp/nope' }, DEFAULT_PET_SETTINGS)).toThrow(/unknown pet setting/)
  })

  it('reads and persists through the existing pet API prefix', async () => {
    const { base, read } = await mounted()
    const before = await fetch(`${base}${PET_SETTINGS_API_PATH}`)
    expect(before.status).toBe(200)
    expect((await before.json() as { settings: PetSettings }).settings.widgetEnabled).toBe(true)

    const changed = await fetch(`${base}${PET_SETTINGS_API_PATH}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ patch: { widgetEnabled: false, autoInterval: '5min' } }),
    })
    expect(changed.status).toBe(200)
    expect(read()).toMatchObject({ widgetEnabled: false, autoInterval: '5min' })
  })

  it('rejects non-loopback authority and never contacts an unlisted image host', async () => {
    const { base, port } = await mounted()
    const forbidden = await new Promise<number>((resolve, reject) => {
      const req = httpRequest({
        host: '127.0.0.1', port, path: PET_SETTINGS_API_PATH,
        headers: { host: 'example.com' },
      }, res => { res.resume(); res.on('end', () => { resolve(res.statusCode ?? 0) }) })
      req.on('error', reject)
      req.end()
    })
    expect(forbidden).toBe(403)
    const image = await fetch(`${base}/plugins/dsh-pet-corner/api/img?url=${encodeURIComponent('https://example.com/cat.png')}`)
    expect(image.status).toBe(403)
  })

  it('answers whitelisted upstream outages with HTTP 200 package fallbacks', async () => {
    const upstream = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline fixture'))
    vi.stubGlobal('fetch', upstream)
    const { port } = await mounted()

    // These are the two browser-visible request shapes that previously
    // surfaced as 502 during the eager preload race.
    const dog = await localGet(port, `${PET_API_PREFIX}/dogceo/breeds/image/random?t=1`)
    expect(dog.status).toBe(200)
    expect(dog.headers['x-dsh-pet-fallback']).toBe('package')
    const reply = JSON.parse(dog.body.toString('utf8')) as { message: string; status: string }
    expect(reply).toEqual(expect.objectContaining({ message: PET_FALLBACK_IMAGE_URL, status: 'success' }))
    expect(imgUrl(reply.message)).toBe(PET_FALLBACK_IMAGE_URL)

    const image = await localGet(
      port,
      `${PET_API_PREFIX}/img?url=${encodeURIComponent('https://images.dog.ceo/breeds/retriever/offline.jpg')}`,
    )
    expect(image.status).toBe(200)
    expect(image.headers['content-type']).toBe('image/png')
    expect(image.headers['x-dsh-pet-fallback']).toBe('package')
    expect([...image.body.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(upstream).toHaveBeenCalledTimes(2)
  })
})
