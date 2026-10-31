/**
 * Builds a minimal, byte-accurate single-or-multi-page PDF entirely by hand
 * (no pdf-lib dependency) so tests can exercise PDF page extraction without
 * needing a checked-in binary fixture file.
 */
export function makeTestPdf(pageTexts: string[]): Buffer {
  const objects: string[] = []
  const pageObjIds: number[] = []
  const contentObjIds: number[] = []

  // Object numbering: 1 = Catalog, 2 = Pages, then one Page + one Contents
  // object per page, then one shared Font object at the end.
  let nextId = 3
  for (let i = 0; i < pageTexts.length; i++) {
    pageObjIds.push(nextId++)
    contentObjIds.push(nextId++)
  }
  const fontObjId = nextId++

  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`
  objects[2] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageTexts.length} >>`

  pageTexts.forEach((text, i) => {
    const pageId = pageObjIds[i]
    const contentId = contentObjIds[i]
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 150] ` +
      `/Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontObjId} 0 R >> >> >>`
    const streamText = `BT /F1 18 Tf 10 100 Td (${text.replace(/([()\\])/g, '\\$1')}) Tj ET`
    objects[contentId] = `<< /Length ${streamText.length} >>\nstream\n${streamText}\nendstream`
  })

  objects[fontObjId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`

  const totalObjects = fontObjId
  let body = '%PDF-1.4\n'
  const offsets: number[] = new Array(totalObjects + 1).fill(0)

  for (let id = 1; id <= totalObjects; id++) {
    offsets[id] = Buffer.byteLength(body, 'latin1')
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`
  }

  const xrefOffset = Buffer.byteLength(body, 'latin1')
  let xref = `xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`
  for (let id = 1; id <= totalObjects; id++) {
    xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  }

  const trailer = `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return Buffer.from(body + xref + trailer, 'latin1')
}
