import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CryptoAdapter } from './cryptoAdapter'
import type { ApiKeyEntry, ProviderId } from '@shared/types'
import { TEXT_PROVIDERS } from '@shared/types'

interface StoredFile {
  // provider -> base64-encoded ciphertext
  entries: Partial<Record<ProviderId, string>>
}

/**
 * Persists provider API keys encrypted-at-rest in the app's userData
 * directory. Keys never leave this machine: there is no backend server and
 * no telemetry call in this module or anywhere else in the app.
 */
export class KeyStore {
  private readonly filePath: string

  constructor(
    userDataDir: string,
    private readonly crypto: CryptoAdapter
  ) {
    mkdirSync(userDataDir, { recursive: true })
    this.filePath = join(userDataDir, 'api-keys.enc.json')
  }

  get backend(): CryptoAdapter['backend'] {
    return this.crypto.backend
  }

  private readFile(): StoredFile {
    if (!existsSync(this.filePath)) return { entries: {} }
    try {
      const raw = readFileSync(this.filePath, 'utf8')
      return JSON.parse(raw) as StoredFile
    } catch {
      return { entries: {} }
    }
  }

  private writeFile(data: StoredFile): void {
    writeFileSync(this.filePath, JSON.stringify(data), { mode: 0o600 })
  }

  async setKey(provider: ProviderId, apiKey: string): Promise<void> {
    const data = this.readFile()
    const cipher = await this.crypto.encrypt(apiKey)
    data.entries[provider] = cipher.toString('base64')
    this.writeFile(data)
  }

  deleteKey(provider: ProviderId): void {
    const data = this.readFile()
    delete data.entries[provider]
    this.writeFile(data)
  }

  async getKey(provider: ProviderId): Promise<string | undefined> {
    const data = this.readFile()
    const stored = data.entries[provider]
    if (!stored) return undefined
    try {
      return await this.crypto.decrypt(Buffer.from(stored, 'base64'))
    } catch {
      return undefined
    }
  }

  list(): ApiKeyEntry[] {
    const data = this.readFile()
    return TEXT_PROVIDERS.map((provider) => ({
      provider,
      hasKey: Boolean(data.entries[provider])
    }))
  }
}
