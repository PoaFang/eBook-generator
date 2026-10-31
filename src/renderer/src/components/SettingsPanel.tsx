import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ApiKeyEntry, ProviderId } from '@shared/types'
import { OCR_CAPABLE_PROVIDERS } from '@shared/types'

const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  claude: 'Anthropic Claude',
  deepseek: 'DeepSeek'
}

export default function SettingsPanel(): React.JSX.Element {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<ApiKeyEntry[]>([])
  const [drafts, setDrafts] = useState<Partial<Record<ProviderId, string>>>({})

  const refresh = async (): Promise<void> => {
    const list = await window.api.keys.list()
    setEntries(list)
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleSave = async (provider: ProviderId): Promise<void> => {
    const value = drafts[provider]?.trim()
    if (!value) return
    await window.api.keys.set(provider, value)
    setDrafts((d) => ({ ...d, [provider]: '' }))
    await refresh()
  }

  const handleDelete = async (provider: ProviderId): Promise<void> => {
    await window.api.keys.delete(provider)
    await refresh()
  }

  return (
    <div className="panel">
      <div className="card">
        <h2>{t('settings.apiKeys')}</h2>
        <p className="privacy-note">{t('settings.privacyNote')}</p>
        {entries.map((entry) => (
          <div className="field-row" key={entry.provider}>
            <label>
              {PROVIDER_LABELS[entry.provider]}
              {!OCR_CAPABLE_PROVIDERS.includes(entry.provider) && (
                <div style={{ fontSize: '0.75rem', color: '#999' }}>{t('settings.ocrNotSupported')}</div>
              )}
            </label>
            <input
              type="password"
              placeholder={t('settings.keyPlaceholder', { provider: PROVIDER_LABELS[entry.provider] })}
              value={drafts[entry.provider] ?? ''}
              onChange={(e) => setDrafts((d) => ({ ...d, [entry.provider]: e.target.value }))}
            />
            <button className="primary" onClick={() => handleSave(entry.provider)}>
              {t('settings.save')}
            </button>
            {entry.hasKey && (
              <button className="secondary" onClick={() => handleDelete(entry.provider)}>
                {t('settings.delete')}
              </button>
            )}
            <span className="status-badge">{entry.hasKey ? t('settings.keySaved') : t('settings.keyNotSet')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
