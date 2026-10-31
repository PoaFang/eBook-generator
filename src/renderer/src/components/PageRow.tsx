import { useTranslation } from 'react-i18next'
import type { PageItem, TextMode } from '@shared/types'

interface Props {
  page: PageItem
  textMode: TextMode
  onRunOcr: (id: string) => void
  onEditText: (id: string, text: string) => void
}

export default function PageRow({ page, textMode, onRunOcr, onEditText }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const displayText = textMode === 'translate' ? page.translatedText ?? '' : page.rawText ?? ''

  return (
    <div className="page-row">
      <div className="page-row-head">
        <strong>#{page.order + 1}</strong>
        <span className={`status-badge ${page.status}`}>{t(`workspace.status.${page.status}`)}</span>
        <button className="secondary" onClick={() => onRunOcr(page.id)} disabled={page.status === 'processing'}>
          {t('workspace.runOcr')}
        </button>
      </div>
      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.3rem' }}>{page.sourcePath}</div>
      {page.error && <div style={{ color: '#b23b3b', fontSize: '0.85rem' }}>{page.error}</div>}
      <textarea value={displayText} onChange={(e) => onEditText(page.id, e.target.value)} />
    </div>
  )
}
