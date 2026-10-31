import { describe, expect, it } from 'vitest'
import { shouldTrustSafeStorageBackend } from '../src/main/cryptoAdapter'

describe('shouldTrustSafeStorageBackend', () => {
  it('always trusts macOS Keychain', () => {
    expect(shouldTrustSafeStorageBackend('darwin', undefined)).toBe(true)
  })

  it('always trusts Windows DPAPI', () => {
    expect(shouldTrustSafeStorageBackend('win32', undefined)).toBe(true)
  })

  it('rejects the Linux basic_text backend (hardcoded password, not real protection)', () => {
    expect(shouldTrustSafeStorageBackend('linux', 'basic_text')).toBe(false)
  })

  it('rejects an unknown Linux backend', () => {
    expect(shouldTrustSafeStorageBackend('linux', 'unknown')).toBe(false)
    expect(shouldTrustSafeStorageBackend('linux', undefined)).toBe(false)
  })

  it('trusts a genuine Linux secret-service backend', () => {
    expect(shouldTrustSafeStorageBackend('linux', 'gnome_libsecret')).toBe(true)
    expect(shouldTrustSafeStorageBackend('linux', 'kwallet6')).toBe(true)
  })
})
