import JSZip from 'jszip'
import { v4 as uuid } from 'uuid'
import { escapeXml, textToXhtmlBody } from './textToXhtml'
import type { BookMetadata } from '@shared/types'

export interface EpubChapterInput {
  id: string
  text: string
}

const STYLE_CSS = `body { font-family: serif; line-height: 1.6; margin: 1em; }
h1, h2 { font-weight: bold; }
p { margin: 0 0 1em 0; text-indent: 2em; }`

function chapterFileName(index: number): string {
  return `chapter-${String(index + 1).padStart(3, '0')}.xhtml`
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

function buildContentOpf(
  metadata: BookMetadata,
  chapterIds: string[],
  bookUuid: string,
  modifiedIso: string
): string {
  const manifestItems = chapterIds
    .map((id, i) => `    <item id="chap${i}" href="${chapterFileName(i)}" media-type="application/xhtml+xml"/>`)
    .join('\n')
  const spineItems = chapterIds.map((_, i) => `    <itemref idref="chap${i}"/>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">urn:uuid:${bookUuid}</dc:identifier>
    <dc:title>${escapeXml(metadata.title)}</dc:title>
    <dc:creator>${escapeXml(metadata.author)}</dc:creator>
    <dc:language>${metadata.language}</dc:language>
    <meta property="dcterms:modified">${modifiedIso}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="toc-ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="css/style.css" media-type="text/css"/>
${manifestItems}
  </manifest>
  <spine toc="toc-ncx">
${spineItems}
  </spine>
</package>`
}

function buildNavXhtml(metadata: BookMetadata, chapterCount: number, lang: string): string {
  const items = Array.from({ length: chapterCount }, (_, i) => {
    return `      <li><a href="${chapterFileName(i)}">${escapeXml(metadata.title)} - ${i + 1}</a></li>`
  }).join('\n')

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

function buildTocNcx(metadata: BookMetadata, chapterCount: number, bookUuid: string): string {
  const navPoints = Array.from({ length: chapterCount }, (_, i) => {
    return `    <navPoint id="navPoint-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${escapeXml(metadata.title)} - ${i + 1}</text></navLabel>
      <content src="${chapterFileName(i)}"/>
    </navPoint>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${bookUuid}"/>
  </head>
  <docTitle><text>${escapeXml(metadata.title)}</text></docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>`
}

/**
 * Builds a spec-compliant EPUB3 archive in memory and returns it as a Buffer.
 * The mimetype entry is stored uncompressed and first, as required by the
 * OCF spec for the zip to be recognized as a valid EPUB container.
 */
export async function buildEpub(metadata: BookMetadata, chapters: EpubChapterInput[]): Promise<Buffer> {
  const zip = new JSZip()
  const bookUuid = uuid()
  const modifiedIso = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
  const lang = metadata.language

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

  chapters.forEach((chapter, i) => {
    const title = `${metadata.title} ${i + 1}`
    const bodyHtml = textToXhtmlBody(chapter.text)
    oebps.file(chapterFileName(i), buildChapterXhtml(title, bodyHtml, lang))
  })

  oebps.file(
    'content.opf',
    buildContentOpf(
      metadata,
      chapters.map((c) => c.id),
      bookUuid,
      modifiedIso
    )
  )
  oebps.file('nav.xhtml', buildNavXhtml(metadata, chapters.length, lang))
  oebps.file('toc.ncx', buildTocNcx(metadata, chapters.length, bookUuid))

  return zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' })
}
