function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Converts plain OCR/translated text into XHTML body markup. A line
 * prefixed with "# " (as emitted by the OCR prompt for detected headings)
 * becomes an <h2>; blank lines separate paragraphs.
 */
export function textToXhtmlBody(text: string): string {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)

  if (blocks.length === 0) {
    return '<p></p>'
  }

  return blocks
    .map((block) => {
      if (block.startsWith('# ')) {
        return `<h2>${escapeXml(block.slice(2).trim())}</h2>`
      }
      const escapedLines = block.split('\n').map((line) => escapeXml(line.trim()))
      return `<p>${escapedLines.join('<br/>')}</p>`
    })
    .join('\n')
}

export { escapeXml }
