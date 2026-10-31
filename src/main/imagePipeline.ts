import sharp from 'sharp'
import { readFile } from 'node:fs/promises'

const MAX_DIMENSION = 2000
const JPEG_QUALITY = 85

export interface PreparedImage {
  base64: string
  mimeType: 'image/jpeg'
}

/**
 * Normalizes an arbitrary input image (any format sharp supports: jpg, png,
 * webp, heic, tiff, bmp, ...) to an orientation-corrected, size-capped JPEG
 * so it is cheap to upload to vision APIs while staying legible.
 */
export async function prepareImageForOcr(filePath: string): Promise<PreparedImage> {
  const input = await readFile(filePath)
  const buffer = await sharp(input)
    .rotate() // apply EXIF orientation
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()

  return { base64: buffer.toString('base64'), mimeType: 'image/jpeg' }
}
