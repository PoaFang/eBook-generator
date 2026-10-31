import { useTranslation } from 'react-i18next'
import type { PageItem, TextMode } from '@shared/types'

interface Props {
  page: PageItem
  textMode: TextMode
  isFirst: boolean
  isLast: boolean
  onRunOcr: (id: string) => void
  onEditText: (id: string, text: string) => void
  onEditChapterTitle: (id: string, title: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
}

export default function PageRow({
  page,
  textMode,
  isFirst,
  isLast,
  onRunOcr,
  onEditText,
  onEditChapterTitle,
  onMove
}: Props): React.JSX.Element {
  const { t } = useTranslation()
  const displayText = textMode === 'translate' ? page.translatedText ?? '' : page.rawText ?? ''

  return (
    <div className="page-row">
      <div className="page-row-head">
        <strong>#{page.order + 1}</strong>
        <span className={`status-badge ${page.status}`}>{t(`workspace.status.${page.status}`)}</span>
        <button className="secondary" onClick={() => onMove(page.id, 'up')} disabled={isFirst} title={t('workspace.moveUp')}>
          ↑
        </button>
        <button className="secondary" onClick={() => onMove(page.id, 'down')} disabled={isLast} title={t('workspace.moveDown')}>
          ↓
        </button>
        <button className="secondary" onClick={() => onRunOcr(page.id)} disabled={page.status === 'processing'}>
          {t('workspace.runOcr')}
        </button>
      </div>
      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.3rem' }}>{page.sourcePath}</div>
      {page.error && <div style={{ color: '#b23b3b', fontSize: '0.85rem' }}>{page.error}</div>}
      <input
        type="text"
        placeholder={t('workspace.chapterTitlePlaceholder')}
        value={page.chapterTitle ?? ''}
        onChange={(e) => onEditChapterTitle(page.id, e.target.value)}
        style={{ marginBottom: '0.4rem' }}
      />
      <textarea value={displayText} onChange={(e) => onEditText(page.id, e.target.value)} />
    </div>
  )
}
