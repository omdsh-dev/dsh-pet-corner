/**
 * The pet's picture panel: opened by clicking the floating pet. Pictures come
 * from the preload pool (instant blob swaps) with a direct network fallback,
 * plus the cat-fact line, caption input, favorites strip, and optional
 * auto-refresh while the panel is open.
 */

import {
  useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent,
} from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { PetSettings } from '../pet-settings.ts'
import { NS } from './locales.ts'
import type { FavoriteKind, PetFavorites } from './store.ts'
import type { PetPool } from './preload.ts'
import {
  catFactUrl, catSaysUrl, catUrl, dogBreedsUrl, dogUrl, fetchJson, flattenBreeds,
  foxUrl, imgUrl,
  type CatFactReply, type DogBreedsReply, type DogImageReply, type FoxReply,
} from './api.ts'
import { EmptyPetsArt } from './art.tsx'
import css from './styles.module.css'

/** Business props supplied by the floating pet. */
export interface PetPanelProps {
  t: TranslateNS<typeof NS>
  /** Live settings snapshot supplier + reactive value for this render. */
  settings: PetSettings
  /** Preload pool (instant swaps). */
  pool: PetPool
  /** Reactive favorites store. */
  favorites: PetFavorites
}

/** The four segment filters. */
type Filter = 'all' | 'cat' | 'dog' | 'fox'

/** Picture-card lifecycle status. */
type PictureStatus = 'idle' | 'loading' | 'ready' | 'error'

/** One displayed picture. */
interface CurrentPicture {
  /** Render URL (blob for pooled pictures, proxied otherwise). */
  url: string
  /** Proxied same-origin URL — the persistable identity. */
  sourceUrl: string
  kind: FavoriteKind
}

/** Auto-refresh cadence in milliseconds. */
const INTERVAL_MS: Record<Exclude<PetSettings['autoInterval'], 'off'>, number> = {
  '5min': 5 * 60_000,
  '30min': 30 * 60_000,
}

/** Debounce window for the shuffle button. */
const SHUFFLE_DEBOUNCE_MS = 400

/** Fade-out duration before a direct picture swap (matches the CSS transition). */
const FADE_MS = 150

/** The pet's picture panel body. */
export function PetPanel({ t, settings, pool, favorites }: PetPanelProps): JSX.Element {
  const favoritesState = useSyncExternalStore(
    favorites.store.subscribe.bind(favorites.store),
    favorites.store.getSnapshot.bind(favorites.store),
  )

  const [filter, setFilter] = useState<Filter>('all')
  const [breed, setBreed] = useState('')
  const [breeds, setBreeds] = useState<string[]>([])
  const [current, setCurrent] = useState<CurrentPicture | null>(null)
  const [status, setStatus] = useState<PictureStatus>('idle')
  const [fadeOut, setFadeOut] = useState(false)
  const [fact, setFact] = useState<string | null>(null)
  const [say, setSay] = useState('')

  // Generation guard: stale async replies must never clobber a newer picture.
  const genRef = useRef(0)
  const lastShuffleRef = useRef(0)
  const currentRef = useRef<CurrentPicture | null>(null)
  currentRef.current = current

  const factsEnabled = settings.sources.includes('facts')
  const effectiveBreed = breed !== '' ? breed : settings.defaultBreed

  /** Fetch one cat fact for the new picture; failures degrade silently. */
  const loadFact = useCallback(async (gen: number) => {
    if (!factsEnabled) return
    try {
      const reply = await fetchJson<CatFactReply>(catFactUrl())
      if (gen === genRef.current) setFact(reply.fact)
    } catch {
      // Cat Facts is rate-limited; the line simply stays hidden on failure.
    }
  }, [factsEnabled])

  /** Hand the previous picture's blob back to the pool for revocation. */
  const releasePrevious = useCallback(() => {
    const previous = currentRef.current
    if (previous !== null) pool.release(previous.url)
  }, [pool])

  /** Show a pooled picture instantly (no fade, no skeleton). */
  const showPooled = useCallback((pet: { kind: FavoriteKind; url: string; sourceUrl: string }) => {
    const gen = ++genRef.current
    releasePrevious()
    setCurrent({ url: pet.url, sourceUrl: pet.sourceUrl, kind: pet.kind })
    setStatus('ready')
    setFact(null)
    void loadFact(gen)
  }, [releasePrevious, loadFact])

  /** Swap to a network picture with the 150ms fade-out handshake. */
  const showDirect = useCallback((url: string, sourceUrl: string, kind: FavoriteKind) => {
    const gen = ++genRef.current
    setFadeOut(true)
    window.setTimeout(() => {
      if (gen !== genRef.current) return
      releasePrevious()
      setCurrent({ url, sourceUrl, kind })
      setStatus('loading')
      setFadeOut(false)
      setFact(null)
      void loadFact(gen)
    }, FADE_MS)
  }, [releasePrevious, loadFact])

  /** Load a picture for the current filter: pool first, network fallback. */
  const loadFor = useCallback(async (target: Filter) => {
    const gen = ++genRef.current
    const wanted = target === 'all' ? undefined : target
    const pooled = pool.take(wanted)
    if (pooled !== null) {
      if (gen !== genRef.current) {
        pool.release(pooled.url)
        return
      }
      showPooled(pooled)
      return
    }
    try {
      if (target === 'cat') {
        if (gen !== genRef.current) return
        const sourceUrl = catUrl()
        showDirect(sourceUrl, sourceUrl, 'cat')
      } else if (target === 'fox') {
        const reply = await fetchJson<FoxReply>(foxUrl())
        if (gen !== genRef.current) return
        const sourceUrl = imgUrl(reply.image)
        showDirect(sourceUrl, sourceUrl, 'fox')
      } else if (target === 'dog') {
        const reply = await fetchJson<DogImageReply>(dogUrl(effectiveBreed))
        if (gen !== genRef.current) return
        const sourceUrl = imgUrl(reply.message)
        showDirect(sourceUrl, sourceUrl, 'dog')
      } else {
        const enabled = (['cat', 'dog', 'fox'] as const).filter(source => settings.sources.includes(source))
        const chosen = enabled.length > 0
          ? enabled[Math.floor(Math.random() * enabled.length)]
          : 'cat'
        if (chosen === 'cat') {
          if (gen !== genRef.current) return
          const sourceUrl = catUrl()
          showDirect(sourceUrl, sourceUrl, 'cat')
        } else if (chosen === 'dog') {
          const reply = await fetchJson<DogImageReply>(dogUrl(effectiveBreed))
          if (gen !== genRef.current) return
          const sourceUrl = imgUrl(reply.message)
          showDirect(sourceUrl, sourceUrl, 'dog')
        } else {
          const reply = await fetchJson<FoxReply>(foxUrl())
          if (gen !== genRef.current) return
          const sourceUrl = imgUrl(reply.image)
          showDirect(sourceUrl, sourceUrl, 'fox')
        }
      }
    } catch {
      if (gen !== genRef.current) return
      setStatus('error')
    }
  }, [pool, settings.sources, effectiveBreed, showPooled, showDirect])

  // First picture on mount.
  useEffect(() => {
    // Preloading starts only after the user opens the panel. A page refresh
    // therefore never calls pet upstreams just because the plugin is present.
    void pool.warm()
    void loadFor(filter)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only seed; filter changes reload through the segments.
  }, [])

  // Dog breed catalog (silent failure keeps the free-text "any breed" option).
  useEffect(() => {
    let live = true
    fetchJson<DogBreedsReply>(dogBreedsUrl())
      .then(reply => { if (live) setBreeds(flattenBreeds(reply.message)) })
      .catch(() => {})
    return () => { live = false }
  }, [])

  // Optional auto-refresh while the panel is open.
  useEffect(() => {
    const ms = INTERVAL_MS[settings.autoInterval as keyof typeof INTERVAL_MS]
    if (ms === undefined) return
    const id = window.setInterval(() => { void loadFor(filter) }, ms)
    return () => { window.clearInterval(id) }
  }, [settings.autoInterval, filter, loadFor])

  const shuffle = useCallback(() => {
    const now = Date.now()
    if (now - lastShuffleRef.current < SHUFFLE_DEBOUNCE_MS) return
    lastShuffleRef.current = now
    void loadFor(filter)
  }, [loadFor, filter])

  const onSaySubmit = useCallback((event: FormEvent) => {
    event.preventDefault()
    if (say.trim() === '') return
    const sourceUrl = catSaysUrl(say)
    showDirect(sourceUrl, sourceUrl, 'cat')
    setSay('')
  }, [say, showDirect])

  const isFavorite = current !== null && favoritesState.favorites.some(favorite => favorite.url === current.sourceUrl)
  const toggleFavorite = useCallback(() => {
    if (current === null) return
    if (isFavorite) favorites.remove(current.sourceUrl)
    else favorites.add({ id: current.sourceUrl, url: current.sourceUrl, kind: current.kind })
  }, [current, isFavorite, favorites])

  const gen = genRef.current

  return (
    <div className={css.panel}>
      <div className={css.segments} role="radiogroup" aria-label="picture filter">
        {(['all', 'cat', 'dog', 'fox'] as const).map(kind => (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={filter === kind}
            className={`${css.segment}${filter === kind ? ` ${css.segmentActive}` : ''}`}
            onClick={() => {
              setFilter(kind)
              void loadFor(kind)
            }}
          >
            {t(kind === 'all' ? 'view.segment.all'
              : kind === 'cat' ? 'view.segment.cat'
                : kind === 'dog' ? 'view.segment.dog' : 'view.segment.fox')}
          </button>
        ))}
      </div>

      {filter === 'dog' && (
        <div className={css.breedRow}>
          <select
            className={css.select}
            value={breed}
            onChange={event => {
              setBreed(event.target.value)
              void loadFor('dog')
            }}
            aria-label={t('settings.breed.title')}
          >
            <option value="">{t('view.breed.any')}</option>
            {breeds.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
      )}

      <div className={css.card}>
        {current !== null && (
          <img
            key={`${current.url}:${gen}`}
            className={`${css.image}${status === 'loading' || fadeOut ? ` ${css.imageHidden}` : ''}`}
            src={current.url}
            alt=""
            onLoad={() => { setStatus('ready') }}
            onError={() => { setStatus('error') }}
          />
        )}
        {(status === 'loading' || status === 'idle') && <div className={css.skeleton} aria-hidden="true" />}
        {status === 'error' && (
          <div className={css.errorCard} role="alert">
            <span className={css.errorEmoji}>🐾💤</span>
            <span>{t('view.error.upstream')}</span>
            <button type="button" className={css.retryButton} onClick={() => { void loadFor(filter) }}>
              {t('view.error.retry')}
            </button>
          </div>
        )}
      </div>

      {factsEnabled && fact !== null && (
        <p className={css.facts}>
          {t('view.facts.label')}：{fact}
        </p>
      )}

      <div className={css.actions}>
        <button type="button" className={css.actionButton} onClick={shuffle}>
          {t('view.action.shuffle')}
        </button>
        <form onSubmit={onSaySubmit}>
          <input
            className={css.sayInput}
            value={say}
            onChange={event => { setSay(event.target.value) }}
            placeholder={t('view.action.sayPlaceholder')}
            aria-label={t('view.action.say')}
            maxLength={60}
          />
        </form>
        <button
          type="button"
          className={`${css.actionButton}${isFavorite ? ` ${css.actionButtonFavorited}` : ''}`}
          onClick={toggleFavorite}
          disabled={current === null}
        >
          {isFavorite ? t('view.action.unfavorite') : t('view.action.favorite')}
        </button>
      </div>

      <div className={css.favoritesSection}>
        <h3 className={css.favoritesTitle}>{t('view.favorites.title')}</h3>
        {favoritesState.favorites.length === 0 ? (
          <div className={css.favoriteEmpty}>
            <EmptyPetsArt className={css.favoriteEmptyArt} />
            <span>{t('view.favorites.empty')}</span>
            <span aria-hidden="true">({t('view.favorites.remove')})</span>
          </div>
        ) : (
          <div className={css.favoritesStrip}>
            {favoritesState.favorites.map(favorite => (
              <img
                key={favorite.id}
                className={css.favoriteThumb}
                src={favorite.url}
                alt={favorite.kind}
                title={`${favorite.kind} — ${t('view.favorites.remove')}`}
                onClick={() => {
                  setFilter(favorite.kind === 'cat' ? 'cat' : favorite.kind === 'dog' ? 'dog' : 'fox')
                  showDirect(favorite.url, favorite.url, favorite.kind)
                }}
                onContextMenu={event => {
                  event.preventDefault()
                  favorites.remove(favorite.url)
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
