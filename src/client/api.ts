/**
 * Browser-side API surface: every upstream request goes through the same-
 * origin host proxy (whitelisted server-side). The client never dials an
 * upstream domain directly.
 */

/** Same-origin proxy base (route registered by the host plugin entry). */
const BASE = '/plugins/dsh-pet-corner/api'

/** Build a proxied URL with a cache-busting stamp so repeat hits fetch fresh media. */
function busted(path: string): string {
  const separator = path.includes('?') ? '&' : '?'
  return `${BASE}${path}${separator}t=${Date.now()}`
}

/** Random cat picture (cataas; the proxy base already ends in /cat). */
export function catUrl(): string {
  return busted('/cataas')
}

/** Random cat GIF (cataas /cat/gif). */
export function catGifUrl(): string {
  return busted('/cataas/gif')
}

/** Cat picture with text stamped on it (cataas /cat/says). */
export function catSaysUrl(text: string): string {
  const clean = text.trim().slice(0, 60)
  return busted(`/cataas/says/${encodeURIComponent(clean)}`) + '&fontSize=40&fontColor=white'
}

/** Random dog picture for a breed (dog.ceo; empty breed = any). */
export function dogUrl(breed: string): string {
  const path = breed === '' ? '/dogceo/breeds/image/random' : `/dogceo/breed/${encodeURIComponent(breed)}/images/random`
  return busted(path)
}

/** Dog breed catalog (dog.ceo). */
export function dogBreedsUrl(): string {
  return `${BASE}/dogceo/breeds/list/all`
}

/** Random fox picture (randomfox.ca — JSON body carrying the image URL). */
export function foxUrl(): string {
  return busted('/randomfox')
}

/** One cat fact (catfact.ninja — rate-limited; callers degrade silently). */
export function catFactUrl(): string {
  return busted('/catfact')
}

/** Wrap an upstream image URL handed back by a JSON endpoint into the host passthrough. */
export function imgUrl(upstream: string): string {
  if (upstream.startsWith(`${BASE}/fallback/`)) return upstream
  return `${BASE}/img?url=${encodeURIComponent(upstream)}`
}

/** Fetch one JSON body through the proxy; non-2xx rejects with a short message. */
export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`pet-corner upstream answered ${response.status}`)
  }
  return await response.json() as T
}

/** Dog CEO random-picture reply shape. */
export interface DogImageReply {
  message: string
  status: string
}

/** RandomFox reply shape. */
export interface FoxReply {
  image: string
}

/** Dog CEO breed catalog reply shape. */
export interface DogBreedsReply {
  message: Record<string, string[]>
  status: string
}

/** Cat Facts reply shape. */
export interface CatFactReply {
  fact: string
  length: number
}

/** Flatten the dog.ceo breed catalog into selectable `breed[/sub]` labels. */
export function flattenBreeds(catalog: Record<string, string[]>): string[] {
  const breeds: string[] = []
  for (const [breed, subs] of Object.entries(catalog)) {
    if (subs.length === 0) breeds.push(breed)
    else for (const sub of subs) breeds.push(`${breed}/${sub}`)
  }
  return breeds.sort()
}
