import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsPanel from './components/SettingsPanel'
import WorkspacePanel from './components/WorkspacePanel'
import { UI_LANGUAGES } from './i18n'

type Tab = 'workspace' | 'settings'

export default function App(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState<Tab>('workspace')

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>{t('appTitle')}</h1>
        <nav className="app-nav">
          <button className={tab === 'workspace' ? 'active' : ''} onClick={() => setTab('workspace')}>
            {t('nav.workspace')}
          </button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
            {t('nav.settings')}
          </button>
        </nav>
        <select value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
          {UI_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </header>
      <main className="app-main">{tab === 'workspace' ? <WorkspacePanel /> : <SettingsPanel />}</main>
    </div>
  )
}
