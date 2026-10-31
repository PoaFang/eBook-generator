import { describe, expect, it, afterEach } from 'vitest'
import sharp from 'sharp'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { prepareImageForOcr } from '../src/main/imagePipeline'

describe('prepareImageForOcr', () => {
  let dir: string

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  it('converts a PNG input into base64 JPEG output', async () => {
    dir = mkdtempSync(join(tmpdir(), 'fayin-img-test-'))
    const pngBuffer = await sharp({
      create: { width: 400, height: 300, channels: 3, background: { r: 255, g: 255, b: 255 } }
    })
      .png()
      .toBuffer()
    const filePath = join(dir, 'page.png')
    writeFileSync(filePath, pngBuffer)

    const result = await prepareImageForOcr(filePath)

    expect(result.mimeType).toBe('image/jpeg')
    expect(result.base64.length).toBeGreaterThan(0)
    const decoded = Buffer.from(result.base64, 'base64')
    const meta = await sharp(decoded).metadata()
    expect(meta.format).toBe('jpeg')
  })

  it('caps output dimensions at the configured maximum', async () => {
    dir = mkdtempSync(join(tmpdir(), 'fayin-img-test-'))
    const bigBuffer = await sharp({
      create: { width: 4000, height: 3000, channels: 3, background: { r: 10, g: 10, b: 10 } }
    })
      .jpeg()
      .toBuffer()
    const filePath = join(dir, 'big.jpg')
    writeFileSync(filePath, bigBuffer)

    const result = await prepareImageForOcr(filePath)
    const decoded = Buffer.from(result.base64, 'base64')
    const meta = await sharp(decoded).metadata()

    expect(meta.width).toBeLessThanOrEqual(2000)
    expect(meta.height).toBeLessThanOrEqual(2000)
  })

  it('does not upscale images smaller than the maximum', async () => {
    dir = mkdtempSync(join(tmpdir(), 'fayin-img-test-'))
    const smallBuffer = await sharp({
      create: { width: 100, height: 80, channels: 3, background: { r: 0, g: 0, b: 0 } }
    })
      .png()
      .toBuffer()
    const filePath = join(dir, 'small.png')
    writeFileSync(filePath, smallBuffer)

    const result = await prepareImageForOcr(filePath)
    const decoded = Buffer.from(result.base64, 'base64')
    const meta = await sharp(decoded).metadata()

    expect(meta.width).toBe(100)
    expect(meta.height).toBe(80)
  })
})
