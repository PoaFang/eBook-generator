import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * Detects whether Calibre's `ebook-convert` CLI is installed on this
 * machine. There is no bundled, permissively-licensed library that writes
 * AZW3/MOBI from scratch, so this is the standard, well-supported way apps
 * add that output format: shell out to the user's own Calibre install
 * (https://calibre-ebook.com, free and open source) if present.
 */
export async function isCalibreAvailable(): Promise<boolean> {
  try {
    await execFileAsync('ebook-convert', ['--version'])
    return true
  } catch {
    return false
  }
}

/**
 * Converts an existing EPUB file to AZW3 or MOBI via Calibre's `ebook-convert`.
 * Arguments are passed as an argv array (never through a shell), so file
 * paths cannot be interpreted as shell syntax.
 */
export async function convertEpubWithCalibre(epubPath: string, destPath: string): Promise<void> {
  try {
    await execFileAsync('ebook-convert', [epubPath, destPath])
  } catch (error) {
    const stderr = error instanceof Error && 'stderr' in error ? String((error as { stderr: unknown }).stderr) : ''
    throw new Error(`Calibre conversion failed${stderr ? `: ${stderr}` : ''}`, { cause: error })
  }
}
