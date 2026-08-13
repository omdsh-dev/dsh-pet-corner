/**
 * Pet Corner settings section: widget toggle, picture-source multi-select,
 * default dog breed, and auto-refresh cadence. Every control writes its field
 * through the pet-corner settings scope (validated Host-side); the section
 * itself only reads the scope snapshot.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  PET_AUTO_INTERVALS, PET_SOURCES,
  type PetAutoInterval, type PetSettings, type PetSource,
} from '../pet-settings.ts'
import { NS } from './locales.ts'
import { dogBreedsUrl, fetchJson, flattenBreeds, type DogBreedsReply } from './api.ts'
import css from './styles.module.css'
import type { PetSettingsClient } from './settings-client.ts'

/** Business face supplied by the settings.section registration. */
export interface SettingsSectionInjected {
  /** Durable pet-corner settings scope. */
  scope: PetSettingsClient
}

/** Full composed props of the settings section entry. */
export type SettingsSectionProps =
  PropsRuntime<'settings.section'> & SettingsSectionInjected & PropsLocale<typeof NS>

/** The Pet Corner settings section body. */
export function SettingsSection({ scope, t }: SettingsSectionProps): JSX.Element {
  const subscribe = useCallback((listener: () => void) => scope.subscribe(listener), [scope])
  const getSnapshot = useCallback(() => scope.getSnapshot(), [scope])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot)
  const settings = snapshot.value

  const [breeds, setBreeds] = useState<string[]>([])

  // Dog breed catalog for the default-breed select (silent failure keeps the
  // "any breed" option working).
  useEffect(() => {
    let live = true
    fetchJson<DogBreedsReply>(dogBreedsUrl())
      .then(reply => { if (live) setBreeds(flattenBreeds(reply.message)) })
      .catch(() => {})
    return () => { live = false }
  }, [])

  const toggleSource = useCallback((source: PetSource, enabled: boolean) => {
    const next = enabled
      ? settings.sources.includes(source) ? settings.sources : [...settings.sources, source]
      : settings.sources.filter(existing => existing !== source)
    void scope.set('sources', next).catch(() => {})
  }, [scope, settings.sources])

  return (
    <div className={css.section}>
      <div className={css.row}>
        <h3 className={css.rowTitle}>{t('settings.widget.enable')}</h3>
        <label className={css.toggleRow}>
          <span
            className={`${css.toggle}${settings.widgetEnabled ? ` ${css.toggleOn}` : ''}`}
            aria-hidden="true"
          >
            <span className={css.toggleKnob} />
          </span>
          <span>{t('settings.widget.enable')}</span>
          <input
            type="checkbox"
            className={css.checkbox}
            style={{ display: 'none' }}
            checked={settings.widgetEnabled}
            onChange={event => {
              void scope.set('widgetEnabled', event.target.checked).catch(() => {})
            }}
          />
        </label>
        <p className={css.hint}>{t('settings.widget.enableHint')}</p>
      </div>

      <div className={css.row}>
        <h3 className={css.rowTitle}>{t('settings.sources.title')}</h3>
        {PET_SOURCES.map(source => (
          <label key={source} className={css.sourceRow}>
            <input
              type="checkbox"
              className={css.checkbox}
              checked={settings.sources.includes(source)}
              onChange={event => { toggleSource(source, event.target.checked) }}
            />
            <span>{t(`settings.sources.${source}` as const)}</span>
          </label>
        ))}
      </div>

      <div className={css.row}>
        <h3 className={css.rowTitle}>{t('settings.breed.title')}</h3>
        <select
          className={css.select}
          value={settings.defaultBreed}
          onChange={event => {
            void scope.set('defaultBreed', event.target.value).catch(() => {})
          }}
        >
          <option value="">{t('view.breed.any')}</option>
          {breeds.map(breed => <option key={breed} value={breed}>{breed}</option>)}
        </select>
      </div>

      <div className={css.row}>
        <h3 className={css.rowTitle}>{t('settings.interval.title')}</h3>
        <select
          className={css.select}
          value={settings.autoInterval}
          onChange={event => {
            void scope.set('autoInterval', event.target.value as PetAutoInterval).catch(() => {})
          }}
        >
          {PET_AUTO_INTERVALS.map(interval => (
            <option key={interval} value={interval}>{t(`settings.interval.${interval}` as const)}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
