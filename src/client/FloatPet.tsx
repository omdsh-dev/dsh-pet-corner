/**
 * The floating pet itself — the whole Pet Corner surface. A 56px draggable
 * cat avatar lives in the bottom-right corner (default on); clicking it opens
 * the picture panel above it, double-clicking hides it until re-enabled in
 * settings, and dragging moves it (position persisted). Mounted on its own
 * React root from the client apply so it exists regardless of sessions and
 * views.
 */

import {
  useCallback, useEffect, useRef, useState, useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import type { PetFavorites } from './store.ts'
import type { PetPool } from './preload.ts'
import type { PetSettingsClient } from './settings-client.ts'
import { PetPanel } from './PetPanel.tsx'
import { CatAvatarHappy, CatAvatarIdle } from './art.tsx'
import css from './styles.module.css'

/** Widget props supplied from the apply-created root. */
export interface FloatPetProps {
  /** Durable pet-corner settings scope. */
  scope: PetSettingsClient
  /** Reactive favorites store. */
  favorites: PetFavorites
  /** Picture preload pool. */
  pool: PetPool
  /** Namespace-bound translate. */
  t: TranslateNS<typeof NS>
}

/** localStorage keys for widget-local UI state. */
const POS_KEY = 'pets.widget.pos'
const HIDDEN_KEY = 'pets.widget.hidden'

/** Widget outer size in px (matches the CSS). */
const SIZE = 56

/** Picture panel width in px (matches the CSS). */
const PANEL_WIDTH = 320

/** Saved drag position. */
interface WidgetPos {
  left: number
  top: number
}

/** Default position: right edge, raised above the corner so it clears the
 * other floating toggles that occupy the bottom-right corner zone. */
function defaultPos(): WidgetPos {
  return {
    left: Math.max(12, window.innerWidth - SIZE - 24),
    top: Math.max(12, window.innerHeight - SIZE - 70),
  }
}

/** Read the persisted position, clamped back into the viewport. A stored
 * position inside the crowded bottom-right corner band (other floating
 * toggles live there) is lifted to the raised default instead. */
function readPos(): WidgetPos {
  const fallback = defaultPos()
  try {
    const raw = localStorage.getItem(POS_KEY)
    if (raw === null) return fallback
    const parsed = JSON.parse(raw) as Partial<WidgetPos>
    if (typeof parsed.left !== 'number' || typeof parsed.top !== 'number') return fallback
    const pos = {
      left: Math.min(Math.max(parsed.left, 8), window.innerWidth - SIZE - 8),
      top: Math.min(Math.max(parsed.top, 8), window.innerHeight - SIZE - 8),
    }
    if (pos.left > window.innerWidth - 160 && pos.top > window.innerHeight - 130) {
      return fallback
    }
    return pos
  } catch {
    return fallback
  }
}

/** The floating pet. */
export function FloatPet({ scope, favorites, pool, t }: FloatPetProps): JSX.Element {
  const subscribe = useCallback((listener: () => void) => scope.subscribe(listener), [scope])
  const getSnapshot = useCallback(() => scope.getSnapshot(), [scope])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot)
  const settings = snapshot.value

  const [pos, setPos] = useState<WidgetPos>(readPos)
  const [hidden, setHidden] = useState(() => localStorage.getItem(HIDDEN_KEY) === '1')
  const [open, setOpen] = useState(false)

  const holderRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null)
  const movedRef = useRef(false)
  const prevEnabledRef = useRef(settings.widgetEnabled)

  // Re-enabling the widget in settings clears the double-click hide flag.
  useEffect(() => {
    const previous = prevEnabledRef.current
    prevEnabledRef.current = settings.widgetEnabled
    if (settings.widgetEnabled && !previous) {
      localStorage.removeItem(HIDDEN_KEY)
      setHidden(false)
    }
  }, [settings.widgetEnabled])

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    movedRef.current = false
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - pos.left,
      offsetY: event.clientY - pos.top,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [pos])

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (drag === null || drag.pointerId !== event.pointerId) return
    movedRef.current = true
    const left = Math.min(Math.max(event.clientX - drag.offsetX, 8), window.innerWidth - SIZE - 8)
    const top = Math.min(Math.max(event.clientY - drag.offsetY, 8), window.innerHeight - SIZE - 8)
    setPos({ left, top })
  }, [])

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (drag === null || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(pos))
    } catch {
      // Persistence is best-effort; the pet still works for this page load.
    }
  }, [pos])

  // Single click (no drag) opens the picture panel; double click hides.
  const onClick = useCallback(() => {
    if (movedRef.current) return
    setOpen(previous => !previous)
  }, [])

  const onDoubleClick = useCallback(() => {
    try {
      localStorage.setItem(HIDDEN_KEY, '1')
    } catch {
      // Best-effort persistence.
    }
    setHidden(true)
    setOpen(false)
  }, [])

  // Close the panel on outside pointer-down.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node | null
      if (target !== null && holderRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => { document.removeEventListener('pointerdown', onPointerDown) }
  }, [open])

  const visible = settings.widgetEnabled && !hidden
  const avatar = open ? <CatAvatarHappy /> : <CatAvatarIdle />

  return (
    <div ref={holderRef} className={css.petRoot}>
      {visible && (
        <div
          className={css.widget}
          style={{ left: pos.left, top: pos.top }}
          role="button"
          tabIndex={0}
          aria-label={t('widget.aria')}
          aria-expanded={open}
          title="🐾"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
        >
          <span className={css.widgetAvatar}>{avatar}</span>
        </div>
      )}
      {visible && open && (
        <div
          className={css.widgetPopover}
          style={{
            left: Math.max(8, Math.min(pos.left + SIZE - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 8)),
            bottom: window.innerHeight - pos.top + 8,
          }}
        >
          <PetPanel t={t} settings={settings} pool={pool} favorites={favorites} />
        </div>
      )}
    </div>
  )
}
