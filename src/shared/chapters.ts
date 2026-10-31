import type { ExportPageInput } from './types'

export interface Chapter {
  /** Explicit title for this chapter; undefined means the caller should
   *  supply a fallback (e.g. "<book title> N"). */
  title?: string
  text: string
}

/**
 * Groups ordered pages into chapters. A page with a `chapterTitle` starts a
 * new chapter; any page without one is appended (with a blank-line
 * separator) to the chapter currently being built, so photographing several
 * pages of the same chapter does not force one EPUB/PDF chapter per page.
 */
export function groupPagesIntoChapters(pages: ExportPageInput[]): Chapter[] {
  const chapters: Chapter[] = []

  for (const page of pages) {
    const startsNewChapter = Boolean(page.chapterTitle) || chapters.length === 0
    if (startsNewChapter) {
      chapters.push({ title: page.chapterTitle, text: page.text })
    } else {
      const current = chapters[chapters.length - 1]
      current.text = current.text.length > 0 ? `${current.text}\n\n${page.text}` : page.text
    }
  }

  return chapters
}
