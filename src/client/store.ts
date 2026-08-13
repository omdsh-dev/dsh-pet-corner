/**
 * Pet Corner favorites store. The pet is a root-scope surface (no slot seat
 * anymore), so favorites live in a standalone snapshot store persisted
 * globally to localStorage under `pets.favorites` — shared across sessions
 * and page reloads.
 */

import {
  createSnapshotStore, type SnapshotStore,
} from '@deepseek-ai/dsh-client-runtime/client'

/** Picture kind label for one favorited picture. */
export type FavoriteKind = 'cat' | 'dog' | 'fox'

/** One favorited picture. */
export interface FavoritePet {
  /** Stable id (the proxied URL is already unique per picture; kept explicit). */
  id: string
  /** Proxied same-origin image URL to render the thumbnail and full view. */
  url: string
  /** Which upstream family the picture came from. */
  kind: FavoriteKind
}

/** Pet Corner favorites state. */
export interface PetFavoritesState {
  favorites: FavoritePet[]
}

/** Reactive favorites store plus its write surface. */
export interface PetFavorites {
  /** Bare snapshot source (subscribe/getSnapshot for uSES). */
  readonly store: SnapshotStore<PetFavoritesState>
  /** Add one picture to the head of the favorites (deduped by URL). */
  add(favorite: FavoritePet): void
  /** Remove the picture with the given proxied URL. */
  remove(url: string): void
}

/**
 * Create the favorites store (constructed in apply world, never at module
 * level). Whole-value JSON persistence; storage failures only disable
 * persistence, never the in-memory store.
 * @returns the reactive store and its write helpers.
 */
export function createPetFavorites(): PetFavorites {
  const store = createSnapshotStore<PetFavoritesState>(
    { favorites: [] },
    { persist: { name: 'pets.favorites' } },
  )
  return {
    store,
    add: (favorite) => {
      store.update((draft) => {
        if (draft.favorites.some(existing => existing.url === favorite.url)) return
        draft.favorites.unshift(favorite)
      })
    },
    remove: (url) => {
      store.update((draft) => {
        draft.favorites = draft.favorites.filter(existing => existing.url !== url)
      })
    },
  }
}
