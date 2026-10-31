import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BookMetadata, ExportPageInput, OutputLanguage, PageItem, ProviderId, TextMode } from '@shared/types'
import { OCR_CAPABLE_PROVIDERS, OUTPUT_LANGUAGES, TEXT_PROVIDERS } from '@shared/types'
import PageRow from './PageRow'

const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  claude: 'Anthropic Claude',
  deepseek: 'DeepSeek'
}

function isPdfPath(path: string): boolean {
  return path.toLowerCase().endsWith('.pdf')
}

export default function WorkspacePanel(): React.JSX.Element {
  const { t } = useTranslation()
  const [pages, setPages] = useState<PageItem[]>([])
  const [bookTitle, setBookTitle] = useState('')
  const [bookAuthor, setBookAuthor] = useState('')
  const [coverImagePath, setCoverImagePath] = useState<string | undefined>(undefined)
  const [textMode, setTextMode] = useState<TextMode>('keep-original')
  const [targetLanguage, setTargetLanguage] = useState<OutputLanguage>('zh-TW')
  const [ocrProvider, setOcrProvider] = useState<ProviderId>('openai')
  const [translateProvider, setTranslateProvider] = useState<ProviderId>('openai')
  const [exportMessage, setExportMessage] = useState<string>('')
  const [isImporting, setIsImporting] = useState(false)

  const importSourceFiles = async (): Promise<void> => {
    const paths = await window.api.dialog.selectSourceFiles()
    if (paths.length === 0) return
    setIsImporting(true)
    try {
      const resolvedImagePaths: string[] = []
      for (const path of paths) {
        if (isPdfPath(path)) {
          const { imagePaths } = await window.api.pdf.extractPages(path)
          resolvedImagePaths.push(...imagePaths)
        } else {
          resolvedImagePaths.push(path)
        }
      }
      setPages((prev) => [
        ...prev,
        ...resolvedImagePaths.map((sourcePath, i) => ({
          id: crypto.randomUUID(),
          sourcePath,
          order: prev.length + i,
          status: 'pending' as const
        }))
      ])
    } finally {
      setIsImporting(false)
    }
  }

  const selectCoverImage = async (): Promise<void> => {
    const path = await window.api.dialog.selectCoverImage()
    if (path) setCoverImagePath(path)
  }

  const updatePage = (id: string, patch: Partial<PageItem>): void => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const movePage = (id: string, direction: 'up' | 'down'): void => {
    setPages((prev) => {
      const index = prev.findIndex((p) => p.id === id)
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (index === -1 || targetIndex < 0 || targetIndex >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next.map((p, i) => ({ ...p, order: i }))
    })
  }

  const runOcrForPage = async (id: string): Promise<void> => {
    const page = pages.find((p) => p.id === id)
    if (!page) return
    updatePage(id, { status: 'processing', error: undefined })
    try {
      const ocrResult = await window.api.ocr.runPage({ pageId: id, imagePath: page.sourcePath, provider: ocrProvider })
      let translatedText: string | undefined
      if (textMode === 'translate') {
        const translateResult = await window.api.translate.runPage({
          pageId: id,
          text: ocrResult.text,
          targetLanguage,
          provider: translateProvider
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

  const buildMetadata = (): BookMetadata => ({
    title: bookTitle || 'Untitled',
    author: bookAuthor,
    language: targetLanguage,
    coverImagePath
  })

  const buildExportPages = (): ExportPageInput[] =>
    pages.map((p) => ({
      id: p.id,
      text: (textMode === 'translate' ? p.translatedText : p.rawText) ?? '',
      chapterTitle: p.chapterTitle
    }))

  const handleExportEpub = async (): Promise<void> => {
    setExportMessage('')
    const destPath = await window.api.dialog.saveEpub(bookTitle || 'book')
    if (!destPath) return
    const result = await window.api.exportEpub({ metadata: buildMetadata(), pages: buildExportPages(), destPath })
    setExportMessage(
      result.success
        ? t('workspace.exportSuccess', { path: result.filePath })
        : t('workspace.exportError', { error: result.error })
    )
  }

  const handleExportPdf = async (): Promise<void> => {
    setExportMessage('')
    const destPath = await window.api.dialog.savePdf(bookTitle || 'book')
    if (!destPath) return
    const result = await window.api.exportPdf({ metadata: buildMetadata(), pages: buildExportPages(), destPath })
    setExportMessage(
      result.success
        ? t('workspace.exportSuccess', { path: result.filePath })
        : t('workspace.exportError', { error: result.error })
    )
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
          <label>{t('workspace.coverImage')}</label>
          <button className="secondary" onClick={selectCoverImage}>
            {t('workspace.selectCoverImage')}
          </button>
          {coverImagePath && (
            <>
              <img src={`file://${coverImagePath}`} alt="cover" style={{ height: '48px', borderRadius: '4px' }} />
              <span style={{ fontSize: '0.8rem', color: '#666' }}>{coverImagePath}</span>
            </>
          )}
        </div>
        <div className="field-row">
          <label>{t('workspace.ocrProvider')}</label>
          <select value={ocrProvider} onChange={(e) => setOcrProvider(e.target.value as ProviderId)}>
            {OCR_CAPABLE_PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="field-row">
          <label>{t('workspace.textMode')}</label>
          <select value={textMode} onChange={(e) => setTextMode(e.target.value as TextMode)}>
            <option value="keep-original">{t('workspace.textMode.keepOriginal')}</option>
            <option value="translate">{t('workspace.textMode.translate')}</option>
          </select>
        </div>
        {textMode === 'translate' && (
          <div className="field-row">
            <label>{t('workspace.translateProvider')}</label>
            <select value={translateProvider} onChange={(e) => setTranslateProvider(e.target.value as ProviderId)}>
              {TEXT_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
        )}
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
          <button className="primary" onClick={importSourceFiles} disabled={isImporting}>
            {isImporting ? t('workspace.importing') : t('workspace.importFiles')}
          </button>
          <button className="secondary" onClick={runOcrAll} disabled={pages.length === 0}>
            {t('workspace.runOcrAll')}
          </button>
          <button className="secondary" onClick={handleExportEpub} disabled={pages.length === 0}>
            {t('workspace.exportEpub')}
          </button>
          <button className="secondary" onClick={handleExportPdf} disabled={pages.length === 0}>
            {t('workspace.exportPdf')}
          </button>
        </div>
        {exportMessage && <p>{exportMessage}</p>}

        {pages.length === 0 ? (
          <p>{t('workspace.noPages')}</p>
        ) : (
          pages.map((page, index) => (
            <PageRow
              key={page.id}
              page={page}
              textMode={textMode}
              isFirst={index === 0}
              isLast={index === pages.length - 1}
              onRunOcr={runOcrForPage}
              onEditText={(id, text) =>
                updatePage(id, textMode === 'translate' ? { translatedText: text } : { rawText: text })
              }
              onEditChapterTitle={(id, title) => updatePage(id, { chapterTitle: title || undefined })}
              onMove={movePage}
            />
          ))
        )}
      </div>
    </div>
  )
}
