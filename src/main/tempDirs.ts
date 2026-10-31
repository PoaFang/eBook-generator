import { rm } from 'node:fs/promises'

const createdTempDirs = new Set<string>()

export function registerTempDir(dir: string): void {
  createdTempDirs.add(dir)
}

/** Best-effort cleanup of every temp dir created this session (e.g. PDF page extraction output). */
export async function cleanupAllTempDirs(): Promise<void> {
  await Promise.all(
    Array.from(createdTempDirs).map((dir) => rm(dir, { recursive: true, force: true }).catch(() => undefined))
  )
  createdTempDirs.clear()
}
