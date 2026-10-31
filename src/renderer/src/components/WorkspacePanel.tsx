import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { OutputLanguage, PageItem, ProviderId, TextMode } from '@shared/types'
import { OUTPUT_LANGUAGES } from '@shared/types'
import PageRow from './PageRow'

const OCR_PROVIDER: ProviderId = 'openai'

export default function WorkspacePanel(): React.JSX.Element {
  const { t } = useTranslation()
  const [pages, setPages] = useState<PageItem[]>([])
  const [bookTitle, setBookTitle] = useState('')
  const [bookAuthor, setBookAuthor] = useState('')
  const [textMode, setTextMode] = useState<TextMode>('keep-original')
  const [targetLanguage, setTargetLanguage] = useState<OutputLanguage>('zh-TW')
  const [exportMessage, setExportMessage] = useState<string>('')

  const importImages = async (): Promise<void> => {
    const paths = await window.api.dialog.selectImages()
    if (paths.length === 0) return
    setPages((prev) => [
      ...prev,
      ...paths.map((sourcePath, i) => ({
        id: crypto.randomUUID(),
        sourcePath,
        order: prev.length + i,
        status: 'pending' as const
      }))
    ])
  }

  const updatePage = (id: string, patch: Partial<PageItem>): void => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const runOcrForPage = async (id: string): Promise<void> => {
    const page = pages.find((p) => p.id === id)
    if (!page) return
    updatePage(id, { status: 'processing', error: undefined })
    try {
      const ocrResult = await window.api.ocr.runPage({ pageId: id, imagePath: page.sourcePath, provider: OCR_PROVIDER })
      let translatedText: string | undefined
      if (textMode === 'translate') {
        const translateResult = await window.api.translate.runPage({
          pageId: id,
          text: ocrResult.text,
          targetLanguage,
          provider: OCR_PROVIDER
        })
        translatedText = translateResult.text
      }
      updatePage(id, { status: 'done', rawText: ocrResult.text, translatedText })
    } catch (error) {
      updatePage(id, { status: 'error', error: error instanceof Error ? error.message : String(error) })
    }
  }

  const runOcrAll = async (): Promise<void> => {
    for (const page of pages) {
      if (page.status === 'done') continue
      await runOcrForPage(page.id)
    }
  }

  const handleExport = async (): Promise<void> => {
    setExportMessage('')
    const destPath = await window.api.dialog.saveEpub(bookTitle || 'book')
    if (!destPath) return
    const exportPages = pages.map((p) => ({
      id: p.id,
      text: (textMode === 'translate' ? p.translatedText : p.rawText) ?? ''
    }))
    const result = await window.api.exportEpub({
      metadata: { title: bookTitle || 'Untitled', author: bookAuthor, language: targetLanguage },
      pages: exportPages,
      destPath
    })
    if (result.success) {
      setExportMessage(t('workspace.exportSuccess', { path: result.filePath }))
    } else {
      setExportMessage(t('workspace.exportError', { error: result.error }))
    }
  }

  return (
    <div className="panel">
      <div className="card">
        <div className="field-row">
          <label>{t('workspace.bookTitle')}</label>
          <input type="text" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} />
        </div>
        <div className="field-row">
          <label>{t('workspace.bookAuthor')}</label>
          <input type="text" value={bookAuthor} onChange={(e) => setBookAuthor(e.target.value)} />
        </div>
        <div className="field-row">
          <label>{t('workspace.textMode')}</label>
          <select value={textMode} onChange={(e) => setTextMode(e.target.value as TextMode)}>
            <option value="keep-original">{t('workspace.textMode.keepOriginal')}</option>
            <option value="translate">{t('workspace.textMode.translate')}</option>
          </select>
        </div>
        <div className="field-row">
          <label>{t('workspace.targetLanguage')}</label>
          <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value as OutputLanguage)}>
            {OUTPUT_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="field-row">
          <button className="primary" onClick={importImages}>
            {t('workspace.importImages')}
          </button>
          <button className="secondary" onClick={runOcrAll} disabled={pages.length === 0}>
            {t('workspace.runOcrAll')}
          </button>
          <button className="secondary" onClick={handleExport} disabled={pages.length === 0}>
            {t('workspace.exportEpub')}
          </button>
        </div>
        {exportMessage && <p>{exportMessage}</p>}

        {pages.length === 0 ? (
          <p>{t('workspace.noPages')}</p>
        ) : (
          pages.map((page) => (
            <PageRow
              key={page.id}
              page={page}
              textMode={textMode}
              onRunOcr={runOcrForPage}
              onEditText={(id, text) =>
                updatePage(id, textMode === 'translate' ? { translatedText: text } : { rawText: text })
              }
            />
          ))
        )}
      </div>
    </div>
  )
}
