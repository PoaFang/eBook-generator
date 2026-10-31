import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { KeyStore } from '../src/main/keyStore'
import { LocalAesFallbackAdapter } from '../src/main/cryptoAdapter'

describe('KeyStore with LocalAesFallbackAdapter', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'fayin-keystore-test-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('round-trips a stored key', async () => {
    const store = new KeyStore(dir, new LocalAesFallbackAdapter(join(dir, 'local.key')))
    await store.setKey('openai', 'sk-test-12345')
    expect(await store.getKey('openai')).toBe('sk-test-12345')
  })

  it('never writes the plaintext key to disk', async () => {
    const store = new KeyStore(dir, new LocalAesFallbackAdapter(join(dir, 'local.key')))
    const secret = 'sk-super-secret-value'
    await store.setKey('openai', secret)
    const onDisk = readFileSync(join(dir, 'api-keys.enc.json'), 'utf8')
    expect(onDisk).not.toContain(secret)
  })

  it('list() reports hasKey correctly and does not leak key material', async () => {
    const store = new KeyStore(dir, new LocalAesFallbackAdapter(join(dir, 'local.key')))
    await store.setKey('gemini', 'gkey')
    const list = store.list()
    const gemini = list.find((e) => e.provider === 'gemini')
    const openai = list.find((e) => e.provider === 'openai')
    expect(gemini?.hasKey).toBe(true)
    expect(openai?.hasKey).toBe(false)
    expect(JSON.stringify(list)).not.toContain('gkey')
  })

  it('deleteKey removes the stored entry', async () => {
    const store = new KeyStore(dir, new LocalAesFallbackAdapter(join(dir, 'local.key')))
    await store.setKey('claude', 'ckey')
    store.deleteKey('claude')
    expect(await store.getKey('claude')).toBeUndefined()
  })

  it('persists across KeyStore instances using the same directory', async () => {
    const store1 = new KeyStore(dir, new LocalAesFallbackAdapter(join(dir, 'local.key')))
    await store1.setKey('deepseek', 'dkey')

    const store2 = new KeyStore(dir, new LocalAesFallbackAdapter(join(dir, 'local.key')))
    expect(await store2.getKey('deepseek')).toBe('dkey')
  })

  it('rejects getKey for a provider that was never set', async () => {
    const store = new KeyStore(dir, new LocalAesFallbackAdapter(join(dir, 'local.key')))
    expect(await store.getKey('openai')).toBeUndefined()
  })
})
