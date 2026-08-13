/**
 * Host-side upstream proxy for Pet Corner: `/plugins/dsh-pet-corner/api/*`.
 * Every browser request to a free keyless pet API goes through this route —
 * the client never dials an upstream domain directly. Upstream targets are
 * whitelist-mapped (never derived from arbitrary user input), response
 * bodies stream through with their content type intact (binary images
 * included). A whitelisted upstream outage degrades to a package-owned image
 * or shape-compatible JSON response with HTTP 200, so the browser keeps a
 * usable pet surface without reporting expected third-party failures as 5xx.
 *
 * Route shapes:
 *   /plugins/dsh-pet-corner/api/<src><rest>?…   src ∈ {cataas, dogceo, randomfox, thecatapi, catfact}
 *   /plugins/dsh-pet-corner/api/img?url=<encoded upstream image URL>
 */

import { readFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import type { SettingsScope } from '@deepseek-ai/dsh-settings'
import { PET_FALLBACK_IMAGE_URL, type PetSettings } from './pet-settings.ts'
import { handlePetSettingsApi, PET_SETTINGS_API_PATH } from './settings-api.ts'

/** Prefix this route claims (longest-prefix-wins over the /plugins bundle route). */
export const PET_API_PREFIX = '/plugins/dsh-pet-corner/api'

/** Whitelist mapping: source key → upstream base URL. The only hosts reachable via path form. */
const UPSTREAMS: Readonly<Record<string, string>> = {
  cataas: 'https://cataas.com/cat',
  dogceo: 'https://dog.ceo/api',
  randomfox: 'https://randomfox.ca/floof',
  thecatapi: 'https://api.thecatapi.com/v1',
  catfact: 'https://catfact.ninja/fact',
}

/** Hosts allowed for the /img passthrough (image URLs handed back by the JSON endpoints above). */
const IMAGE_HOSTS = new Set([
  'cataas.com',
  'dog.ceo',
  'images.dog.ceo',
  'randomfox.ca',
  'api.thecatapi.com',
  'cdn2.thecatapi.com',
  'catfact.ninja',
])

/** Upstream patience before the request is aborted and surfaced as 504. */
const UPSTREAM_TIMEOUT_MS = 30_000

/** Published package asset resolved from both src (tests) and lib (runtime). */
const FALLBACK_IMAGE_FILE = fileURLToPath(new URL('../assets/cat_idle.png', import.meta.url))
let fallbackImageBytes: Promise<Buffer> | undefined

type FallbackKind = 'image' | 'dog-image' | 'dog-breeds' | 'fox' | 'cat-fact' | 'cat-api'

/** Short JSON error envelope with status. */
function sendJson(res: ServerResponse, status: number, body: unknown): void {
  if (res.headersSent) return
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(body))
}

async function sendFallbackImage(req: IncomingMessage, res: ServerResponse): Promise<void> {
  fallbackImageBytes ??= readFile(FALLBACK_IMAGE_FILE)
  const bytes = await fallbackImageBytes
  if (res.headersSent || res.destroyed) return
  res.statusCode = 200
  res.setHeader('content-type', 'image/png')
  res.setHeader('content-length', String(bytes.byteLength))
  res.setHeader('cache-control', 'no-store')
  res.setHeader('x-content-type-options', 'nosniff')
  res.setHeader('x-dsh-pet-fallback', 'package')
  res.end(req.method === 'HEAD' ? undefined : bytes)
}

/** Shape-compatible local response for every browser-facing upstream family. */
async function sendFallback(req: IncomingMessage, res: ServerResponse, kind: FallbackKind): Promise<void> {
  if (kind === 'image') {
    await sendFallbackImage(req, res)
    return
  }
  res.setHeader('x-dsh-pet-fallback', 'package')
  if (kind === 'dog-image') {
    sendJson(res, 200, { message: PET_FALLBACK_IMAGE_URL, status: 'success', fallback: true })
  } else if (kind === 'dog-breeds') {
    sendJson(res, 200, { message: {}, status: 'success', fallback: true })
  } else if (kind === 'fox') {
    sendJson(res, 200, { image: PET_FALLBACK_IMAGE_URL, link: PET_FALLBACK_IMAGE_URL, fallback: true })
  } else if (kind === 'cat-fact') {
    const fact = 'The local DSH cat is keeping you company while the pet service rests.'
    sendJson(res, 200, { fact, length: fact.length, fallback: true })
  } else {
    sendJson(res, 200, [{ id: 'dsh-local-pet', url: PET_FALLBACK_IMAGE_URL, width: 112, height: 112 }])
  }
}

function fallbackKind(src: string, tail: string): FallbackKind {
  if (src === 'cataas') return 'image'
  if (src === 'dogceo') return tail === '/breeds/list/all' ? 'dog-breeds' : 'dog-image'
  if (src === 'randomfox') return 'fox'
  if (src === 'catfact') return 'cat-fact'
  return 'cat-api'
}

/**
 * Forward one request to a validated upstream URL, streaming the body back
 * with the upstream content type. Client disconnects abort the upstream
 * fetch; upstream transport/non-2xx failures use the supplied local fallback.
 */
async function forward(
  req: IncomingMessage,
  res: ServerResponse,
  target: URL,
  fallback: FallbackKind,
): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => { controller.abort() }, UPSTREAM_TIMEOUT_MS)
  res.once('close', () => {
    clearTimeout(timer)
    controller.abort()
  })

  let upstream: Response
  try {
    upstream = await fetch(target, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        accept: '*/*',
        'user-agent': 'dsh-pet-corner/1.0 (host proxy)',
      },
    })
  } catch {
    clearTimeout(timer)
    if (res.writableEnded || res.headersSent || res.destroyed) return
    await sendFallback(req, res, fallback)
    return
  }

  clearTimeout(timer)
  if (res.headersSent) {
    void upstream.body?.cancel().catch(() => {})
    return
  }

  if (upstream.status < 200 || upstream.status >= 300) {
    void upstream.body?.cancel().catch(() => {})
    await sendFallback(req, res, fallback)
    return
  }

  const contentType = upstream.headers.get('content-type')
  if (contentType !== null) res.setHeader('content-type', contentType)
  const cacheControl = upstream.headers.get('cache-control')
  if (cacheControl !== null) res.setHeader('cache-control', cacheControl)
  res.setHeader('x-content-type-options', 'nosniff')

  res.statusCode = upstream.status
  if (req.method === 'HEAD' || upstream.body === null) {
    res.end()
    return
  }

  const stream = Readable.fromWeb(upstream.body as import('node:stream/web').ReadableStream<Uint8Array>)
  stream.on('error', () => {
    if (!res.headersSent && !res.destroyed) {
      void sendFallback(req, res, fallback).catch(() => { res.end() })
      return
    }
    if (!res.writableEnded) res.end()
  })
  stream.pipe(res)
}

/** Handle the /img passthrough with its own host whitelist. */
async function handleImg(req: IncomingMessage, res: ServerResponse, parsed: URL): Promise<void> {
  const raw = parsed.searchParams.get('url')
  if (raw === null || raw === '') {
    sendJson(res, 400, { error: 'missing-url', message: 'the url query parameter is required' })
    return
  }
  let target: URL
  try {
    target = new URL(raw)
  } catch {
    sendJson(res, 400, { error: 'invalid-url', message: 'the url query parameter is not a valid URL' })
    return
  }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    sendJson(res, 403, { error: 'host-not-allowed', message: 'only http(s) image URLs are allowed' })
    return
  }
  if (!IMAGE_HOSTS.has(target.hostname)) {
    sendJson(res, 403, {
      error: 'host-not-allowed',
      message: `host "${target.hostname}" is not in the pet-corner image whitelist`,
    })
    return
  }
  await forward(req, res, target, 'image')
}

/** One request on the pet-corner API prefix. */
export async function handlePetApi(
  req: IncomingMessage,
  res: ServerResponse,
  settings?: SettingsScope<PetSettings>,
): Promise<void> {
  const parsed = new URL(req.url ?? '/', 'http://localhost')
  const pathname = parsed.pathname

  if (pathname === PET_SETTINGS_API_PATH) {
    if (settings === undefined) {
      sendJson(res, 503, { error: 'settings-unavailable', message: 'pet settings are not mounted' })
      return
    }
    await handlePetSettingsApi(settings, req, res)
    return
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'method-not-allowed', message: 'only GET/HEAD requests are supported' })
    return
  }

  if (pathname === PET_FALLBACK_IMAGE_URL) {
    await sendFallbackImage(req, res)
    return
  }

  if (pathname === `${PET_API_PREFIX}/img` || pathname.startsWith(`${PET_API_PREFIX}/img/`)) {
    await handleImg(req, res, parsed)
    return
  }
  if (!pathname.startsWith(`${PET_API_PREFIX}/`)) {
    sendJson(res, 404, { error: 'not-found', message: `unknown pet-corner route "${pathname}"` })
    return
  }

  const rest = pathname.slice(PET_API_PREFIX.length + 1)
  const slash = rest.indexOf('/')
  const src = slash === -1 ? rest : rest.slice(0, slash)
  const base = UPSTREAMS[src]
  if (base === undefined) {
    sendJson(res, 404, { error: 'unknown-source', message: `unknown upstream source "${src}"` })
    return
  }
  const tail = slash === -1 ? '' : rest.slice(slash)
  const target = new URL(`${base}${tail}${parsed.search}`)
  await forward(req, res, target, fallbackKind(src, tail))
}
