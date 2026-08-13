/**
 * Hand-crafted SVG art for Pet Corner (svg-craft style, single-file, zero
 * external deps). Palette: flat kawaii, cream-orange warm scheme
 * (#F6A96B / #FFF4E6) with rounded #8C5A3B outlines. Standalone copies of
 * the decorative pieces live in assets/ (paw.svg, empty_pets.svg) — these
 * React components mirror them so the client bundle needs no asset loader.
 */

import type { SVGProps } from 'react'

const INK = '#8C5A3B'
const ORANGE = '#F6A96B'
const CREAM = '#FFF4E6'
const INNER = '#E8823C'
const BLUSH = '#F7A8A0'

/** Shared shape for the three cat-avatar states (112×112 viewBox). */
function CatHead({ state }: { state: 'idle' | 'happy' | 'sleep' }): JSX.Element {
  const eyes = state === 'idle'
    ? (
      <>
        <circle cx="44" cy="64" r="5" fill={INK} />
        <circle cx="68" cy="64" r="5" fill={INK} />
        <circle cx="45.8" cy="62.4" r="1.4" fill={CREAM} />
        <circle cx="69.8" cy="62.4" r="1.4" fill={CREAM} />
      </>
    )
    : state === 'happy'
      ? (
        <>
          <path d="M38 64 Q44 57 50 64" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M62 64 Q68 57 74 64" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </>
      )
      : (
        <>
          <path d="M39 64 H49" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M63 64 H73" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </>
      )

  const mouth = state === 'happy'
    ? <path d="M50 73 Q56 79 62 73 Q56 74 50 73 Z" fill={INK} />
    : <path d="M51 71 Q56 75 56 71 M56 71 Q56 75 61 71" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />

  return (
    <svg viewBox="0 0 112 112" width="112" height="112" role="img" aria-hidden="true">
      {/* ears */}
      <path d="M17 48 L29 16 Q31 9 39 12 L52 34 Z" fill={ORANGE} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M95 48 L83 16 Q81 9 73 12 L60 34 Z" fill={ORANGE} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M27 32 L32 21 Q33 17 37 18 L43 29 Z" fill={INNER} />
      <path d="M85 32 L80 21 Q79 17 75 18 L69 29 Z" fill={INNER} />
      {/* head */}
      <circle cx="56" cy="64" r="38" fill={ORANGE} stroke={INK} strokeWidth="4" />
      {eyes}
      {/* nose + mouth */}
      <path d="M52.5 66 L59.5 66 L56 70.5 Z" fill={INK} />
      {mouth}
      {/* whiskers */}
      <g stroke={INK} strokeWidth="2.4" strokeLinecap="round">
        <path d="M22 62 H10 M23 70 H10 M24 78 H13" />
        <path d="M90 62 H102 M89 70 H102 M88 78 H99" />
      </g>
      {/* blush */}
      <circle cx="33" cy="72" r="5.5" fill={state === 'happy' ? BLUSH : '#F2B08A'} opacity="0.9" />
      <circle cx="79" cy="72" r="5.5" fill={state === 'happy' ? BLUSH : '#F2B08A'} opacity="0.9" />
      {state === 'sleep' && (
        <g stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M86 22 H96 M82 32 L97 30 M86 42 H96" />
        </g>
      )}
    </svg>
  )
}

/** Idle cat avatar (sitting straight, eyes open). */
export function CatAvatarIdle(): JSX.Element {
  return <CatHead state="idle" />
}

/** Happy cat avatar (closed smiley eyes + blush). */
export function CatAvatarHappy(): JSX.Element {
  return <CatHead state="happy" />
}

/** Sleeping cat avatar (closed eyes + zzz). */
export function CatAvatarSleep(): JSX.Element {
  return <CatHead state="sleep" />
}

/** Single-color line paw icon (header button / tab accent), 16px-usable. */
export function PawIcon(props: SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true" {...props}>
      <g stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="6.2" cy="8.4" rx="1.9" ry="2.4" />
        <ellipse cx="11" cy="5.6" rx="1.9" ry="2.4" />
        <ellipse cx="16.4" cy="7" rx="1.9" ry="2.4" />
        <ellipse cx="19.2" cy="10.8" rx="1.7" ry="2.1" />
        <path d="M12 10.2 C11.2 10.2 10.4 10.9 9.4 12.2 C8.2 13.9 6 14.5 4.6 15.6 C3.8 16.3 3.8 17.4 4.6 18 C5.6 18.9 7 19.4 8.4 19.4 C10.4 19.4 12.3 17.9 13.4 15.7 C14 14.4 14.8 13.6 15.9 13.6 C17 13.6 18.6 14.8 19.4 16 C20.1 17 21.4 17.2 22.2 16.4 C22.8 15.8 22.4 14.8 21.6 14.4 C20.4 13.8 18.4 13.6 17 12.8 C15.8 12.1 14.9 10.7 13.9 9.8 C13.2 9.1 12.7 10.2 12 10.2 Z" />
      </g>
    </svg>
  )
}

/** Empty-state illustration: a cat and a dog sitting back to back under two clouds. */
export function EmptyPetsArt(props: SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg viewBox="0 0 320 190" fill="none" aria-hidden="true" {...props}>
      {/* clouds */}
      <g fill={CREAM} stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path d="M52 40 Q38 40 38 28 Q38 16 50 16 Q52 8 62 8 Q73 8 74 17 Q84 16 88 25 Q92 30 88 35 Q84 40 76 40 Z" />
        <path d="M252 60 Q240 60 240 50 Q240 40 250 40 Q252 33 261 33 Q270 33 271 41 Q279 40 282 47 Q286 52 282 56 Q279 60 272 60 Z" />
      </g>
      {/* ground */}
      <path d="M24 168 Q160 156 296 168" stroke="#D9BFA8" strokeWidth="3" strokeLinecap="round" />
      {/* dog (left) */}
      <g>
        <path d="M96 168 Q92 128 96 108 Q100 92 118 90 L126 90 Q144 92 148 108 Q152 128 148 168 Z" fill="#F0C79B" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
        <circle cx="122" cy="80" r="19" fill="#F0C79B" stroke={INK} strokeWidth="3.5" />
        <path d="M108 72 Q110 50 128 52 Q130 66 130 72 Z" fill="#E8B27D" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M136 72 Q134 50 116 52 Q114 66 114 72 Z" fill="#E8B27D" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M113 84 Q117 89 121 84" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M123 84 Q127 89 131 84" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="122" cy="92" r="3.4" fill={INK} />
        <path d="M118 97 Q122 100 126 97" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M104 168 Q96 150 92 146" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* cat (right) */}
      <g>
        <path d="M186 168 Q190 128 186 110 Q182 94 166 92 L158 92 Q142 94 138 110 Q134 128 138 168 Z" fill={ORANGE} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
        <circle cx="162" cy="82" r="19" fill={ORANGE} stroke={INK} strokeWidth="3.5" />
        <path d="M146 70 L152 52 Q154 46 161 48 L168 62 Z" fill={ORANGE} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M178 70 L172 52 Q170 46 163 48 L156 62 Z" fill={ORANGE} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M154 86 Q157 91 160 86" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M164 86 Q167 91 170 86" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M159 92 L165 92 L162 95.5 Z" fill={INK} />
        <path d="M180 168 Q188 150 192 146" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M140 120 Q128 122 126 132" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      </g>
      {/* tiny hearts */}
      <path d="M160 60 Q162 56 164 60 Q166 56 168 60 Q168 65 164 67 Q160 65 160 60 Z" fill={BLUSH} opacity="0.9" />
    </svg>
  )
}
