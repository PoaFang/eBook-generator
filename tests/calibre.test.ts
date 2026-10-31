import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockExecFile } = vi.hoisted(() => ({ mockExecFile: vi.fn() }))

vi.mock('node:child_process', () => ({ execFile: mockExecFile }))

import { isCalibreAvailable, convertEpubWithCalibre } from '../src/main/calibre'

describe('isCalibreAvailable', () => {
  beforeEach(() => {
    mockExecFile.mockReset()
  })

  it('returns true when `ebook-convert --version` succeeds', async () => {
    mockExecFile.mockImplementation((_file, _args, callback) => callback(null, { stdout: 'calibre 7.0', stderr: '' }))
    expect(await isCalibreAvailable()).toBe(true)
    expect(mockExecFile).toHaveBeenCalledWith('ebook-convert', ['--version'], expect.any(Function))
  })

  it('returns false when ebook-convert is not on PATH (ENOENT)', async () => {
    mockExecFile.mockImplementation((_file, _args, callback) => {
      const err = Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' })
      callback(err)
    })
    expect(await isCalibreAvailable()).toBe(false)
  })
})

describe('convertEpubWithCalibre', () => {
  beforeEach(() => {
    mockExecFile.mockReset()
  })

  it('invokes ebook-convert with the epub and destination paths as plain argv (no shell interpolation)', async () => {
    mockExecFile.mockImplementation((_file, _args, callback) => callback(null, { stdout: '', stderr: '' }))
    await convertEpubWithCalibre('/tmp/book.epub', '/tmp/book.azw3')
    expect(mockExecFile).toHaveBeenCalledWith('ebook-convert', ['/tmp/book.epub', '/tmp/book.azw3'], expect.any(Function))
  })

  it('throws a descriptive error including stderr when conversion fails', async () => {
    mockExecFile.mockImplementation((_file, _args, callback) => {
      const err = Object.assign(new Error('Command failed'), { stderr: 'unsupported input format' })
      callback(err)
    })
    await expect(convertEpubWithCalibre('/tmp/book.epub', '/tmp/book.mobi')).rejects.toThrow(
      /unsupported input format/
    )
  })
})
