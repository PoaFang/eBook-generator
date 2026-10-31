import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CalibreOutputFormat } from '@shared/types'

interface Props {
  lastEpubPath: string | undefined
  defaultName: string
}

export default function CalibreExportSection({ lastEpubPath, defaultName }: Props): React.JSX.Element | null {
  const { t } = useTranslation()
  const [available, setAvailable] = useState<boolean | undefined>(undefined)
  const [message, setMessage] = useState('')

  useEffect(() => {
    window.api.calibre.checkAvailable().then(setAvailable)
  }, [])

  const convert = async (format: CalibreOutputFormat): Promise<void> => {
    if (!lastEpubPath) return
    setMessage('')
    const destPath = await window.api.dialog.saveCalibreOutput(defaultName, format)
    if (!destPath) return
    const result = await window.api.calibre.convert({ epubPath: lastEpubPath, destPath })
    setMessage(
      result.success
        ? t('workspace.exportSuccess', { path: result.filePath })
        : t('workspace.exportError', { error: result.error })
    )
  }

  if (available === undefined) return null

  return (
    <div className="card">
      <h3>{t('workspace.calibreSection')}</h3>
      {!available && <p className="privacy-note">{t('workspace.calibreNotFound')}</p>}
      {available && !lastEpubPath && <p className="privacy-note">{t('workspace.calibreNeedsEpub')}</p>}
      {available && lastEpubPath && (
        <div className="field-row">
          <button className="secondary" onClick={() => convert('azw3')}>
            {t('workspace.convertToAzw3')}
          </button>
          <button className="secondary" onClick={() => convert('mobi')}>
            {t('workspace.convertToMobi')}
          </button>
        </div>
      )}
      {message && <p>{message}</p>}
    </div>
  )
}
