import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Encrypts/decrypts small secrets at rest. Prefers the OS-backed Electron
 * safeStorage (macOS Keychain / Windows DPAPI / Linux libsecret-kwallet).
 * Falls back to a locally generated AES-256-GCM key when safeStorage is
 * unavailable (e.g. Linux without a keyring daemon) so keys are still never
 * written to disk in plaintext.
 */
export interface CryptoAdapter {
  readonly backend: 'os-keychain' | 'local-aes-fallback'
  encrypt(plainText: string): Promise<Buffer>
  decrypt(cipher: Buffer): Promise<string>
}

/**
 * Wraps Electron's async safeStorage API (encryptStringAsync/decryptStringAsync).
 * The sync API (encryptString/decryptString) is deprecated as of Electron 45
 * and slated for removal in Electron 46, so this adapter only uses the async
 * variants from the start.
 */
export class SafeStorageAdapter implements CryptoAdapter {
  readonly backend = 'os-keychain' as const

  constructor(
    private readonly safeStorage: {
      encryptStringAsync(plainText: string): Promise<Buffer>
      decryptStringAsync(cipher: Buffer): Promise<{ result: string; shouldReEncrypt: boolean }>
    }
  ) {}

  async encrypt(plainText: string): Promise<Buffer> {
    return this.safeStorage.encryptStringAsync(plainText)
  }

  async decrypt(cipher: Buffer): Promise<string> {
    const { result } = await this.safeStorage.decryptStringAsync(cipher)
    return result
  }
}

/**
 * On Linux, Electron's safeStorage reports encryption as "available" even
 * when it has fallen back to its own `basic_text` backend, which encrypts
 * with a hardcoded password (effectively no real protection) when no
 * secret service (gnome_libsecret / kwallet) is running. We only trust the
 * OS keychain on Linux when it has actually selected a real secret store;
 * macOS Keychain and Windows DPAPI have no such weak fallback.
 */
export function shouldTrustSafeStorageBackend(platform: NodeJS.Platform, backend: string | undefined): boolean {
  if (platform !== 'linux') return true
  return backend !== 'basic_text' && backend !== 'unknown' && backend !== undefined
}

const ALGO = 'aes-256-gcm'

export class LocalAesFallbackAdapter implements CryptoAdapter {
  readonly backend = 'local-aes-fallback' as const
  private readonly key: Buffer

  constructor(private readonly keyFilePath: string) {
    this.key = LocalAesFallbackAdapter.loadOrCreateKey(keyFilePath)
  }

  private static loadOrCreateKey(keyFilePath: string): Buffer {
    mkdirSync(join(keyFilePath, '..'), { recursive: true })
    if (existsSync(keyFilePath)) {
      return readFileSync(keyFilePath)
    }
    const key = randomBytes(32)
    writeFileSync(keyFilePath, key, { mode: 0o600 })
    try {
      chmodSync(keyFilePath, 0o600)
    } catch {
      // best-effort on platforms without POSIX permissions (e.g. Windows)
    }
    return key
  }

  async encrypt(plainText: string): Promise<Buffer> {
    const iv = randomBytes(12)
    const cipher = createCipheriv(ALGO, this.key, iv)
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    return Buffer.concat([iv, authTag, encrypted])
  }

  async decrypt(cipher: Buffer): Promise<string> {
    const iv = cipher.subarray(0, 12)
    const authTag = cipher.subarray(12, 28)
    const encrypted = cipher.subarray(28)
    const decipher = createDecipheriv(ALGO, this.key, iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  }
}
