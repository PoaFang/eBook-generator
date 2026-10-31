import JSZip from 'jszip'
import { v4 as uuid } from 'uuid'
import { escapeXml, textToXhtmlBody } from './textToXhtml'
import { groupPagesIntoChapters, type Chapter } from '@shared/chapters'
import { prepareCoverImage } from '../imagePipeline'
import type { BookMetadata, ExportPageInput } from '@shared/types'

const STYLE_CSS = `body { font-family: serif; line-height: 1.6; margin: 1em; }
h1, h2 { font-weight: bold; }
p { margin: 0 0 1em 0; text-indent: 2em; }
.cover-page { text-align: center; margin: 0; padding: 0; }
.cover-page img { max-width: 100%; height: auto; }`

function chapterFileName(index: number): string {
  return `chapter-${String(index + 1).padStart(3, '0')}.xhtml`
}

function chapterTitleOrFallback(chapter: Chapter, metadata: BookMetadata, index: number): string {
  return chapter.title ?? `${metadata.title} ${index + 1}`
}

function buildChapterXhtml(title: string, bodyHtml: string, lang: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">
<head>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="css/style.css"/>
</head>
<body>
  <h1>${escapeXml(title)}</h1>
  ${bodyHtml}
</body>
</html>`
}

function buildCoverXhtml(lang: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">
<head>
  <title>Cover</title>
  <link rel="stylesheet" type="text/css" href="css/style.css"/>
</head>
<body class="cover-page">
  <img src="images/cover.jpg" alt="cover"/>
</body>
</html>`
}

function buildContentOpf(
  metadata: BookMetadata,
  chapterCount: number,
  bookUuid: string,
  modifiedIso: string,
  hasCover: boolean
): string {
  const manifestItems = Array.from(
    { length: chapterCount },
    (_, i) => `    <item id="chap${i}" href="${chapterFileName(i)}" media-type="application/xhtml+xml"/>`
  ).join('\n')
  const spineItems = Array.from({ length: chapterCount }, (_, i) => `    <itemref idref="chap${i}"/>`).join('\n')

  const coverManifest = hasCover
    ? `    <item id="cover-image" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>\n    <item id="cover-page" href="cover.xhtml" media-type="application/xhtml+xml"/>\n`
    : ''
  const coverMeta = hasCover ? `    <meta name="cover" content="cover-image"/>\n` : ''
  const coverSpine = hasCover ? `    <itemref idref="cover-page"/>\n` : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">urn:uuid:${bookUuid}</dc:identifier>
    <dc:title>${escapeXml(metadata.title)}</dc:title>
    <dc:creator>${escapeXml(metadata.author)}</dc:creator>
    <dc:language>${metadata.language}</dc:language>
    <meta property="dcterms:modified">${modifiedIso}</meta>
${coverMeta}  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="toc-ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="css/style.css" media-type="text/css"/>
${coverManifest}${manifestItems}
  </manifest>
  <spine toc="toc-ncx">
${coverSpine}${spineItems}
  </spine>
</package>`
}

function buildNavXhtml(titles: string[], lang: string): string {
  const items = titles.map((title, i) => `      <li><a href="${chapterFileName(i)}">${escapeXml(title)}</a></li>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}">
<head><title>Navigation</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <ol>
${items}
    </ol>
  </nav>
</body>
</html>`
}

function buildTocNcx(bookTitle: string, titles: string[], bookUuid: string): string {
  const navPoints = titles
    .map(
      (title, i) => `    <navPoint id="navPoint-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${escapeXml(title)}</text></navLabel>
      <content src="${chapterFileName(i)}"/>
    </navPoint>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${bookUuid}"/>
  </head>
  <docTitle><text>${escapeXml(bookTitle)}</text></docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>`
}

/**
 * Builds a spec-compliant EPUB3 archive in memory and returns it as a Buffer.
 * The mimetype entry is stored uncompressed and first, as required by the
 * OCF spec for the zip to be recognized as a valid EPUB container. Pages
 * are grouped into chapters via `chapterTitle` (see groupPagesIntoChapters),
 * and a cover image is embedded when `metadata.coverImagePath` is set.
 */
export async function buildEpub(metadata: BookMetadata, pages: ExportPageInput[]): Promise<Buffer> {
  const zip = new JSZip()
  const bookUuid = uuid()
  const modifiedIso = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
  const lang = metadata.language
  const chapters = groupPagesIntoChapters(pages)
  const titles = chapters.map((chapter, i) => chapterTitleOrFallback(chapter, metadata, i))
  const hasCover = Boolean(metadata.coverImagePath)

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  )

  const oebps = zip.folder('OEBPS')
  if (!oebps) throw new Error('Failed to create OEBPS folder in EPUB archive')

  oebps.folder('css')?.file('style.css', STYLE_CSS)

  if (metadata.coverImagePath) {
    const coverBuffer = await prepareCoverImage(metadata.coverImagePath)
    oebps.folder('images')?.file('cover.jpg', coverBuffer)
    oebps.file('cover.xhtml', buildCoverXhtml(lang))
  }

  chapters.forEach((chapter, i) => {
    const bodyHtml = textToXhtmlBody(chapter.text)
    oebps.file(chapterFileName(i), buildChapterXhtml(titles[i], bodyHtml, lang))
  })

  oebps.file('content.opf', buildContentOpf(metadata, chapters.length, bookUuid, modifiedIso, hasCover))
  oebps.file('nav.xhtml', buildNavXhtml(titles, lang))
  oebps.file('toc.ncx', buildTocNcx(metadata.title, titles, bookUuid))

  return zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' })
}
