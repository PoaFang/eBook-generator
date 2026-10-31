export const IPC = {
  KEYS_SET: 'keys:set',
  KEYS_LIST: 'keys:list',
  KEYS_DELETE: 'keys:delete',
  DIALOG_SELECT_SOURCE_FILES: 'dialog:selectSourceFiles',
  DIALOG_SELECT_COVER_IMAGE: 'dialog:selectCoverImage',
  DIALOG_SAVE_EPUB: 'dialog:saveEpub',
  DIALOG_SAVE_PDF: 'dialog:savePdf',
  OCR_RUN_PAGE: 'ocr:runPage',
  TRANSLATE_RUN_PAGE: 'translate:runPage',
  PDF_EXTRACT_PAGES: 'pdf:extractPages',
  EXPORT_EPUB: 'export:epub',
  EXPORT_PDF: 'export:pdf'
} as const
