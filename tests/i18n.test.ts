import { describe, expect, it } from 'vitest'
import zhTW from '../src/renderer/src/i18n/locales/zh-TW.json'
import zhCN from '../src/renderer/src/i18n/locales/zh-CN.json'
import en from '../src/renderer/src/i18n/locales/en.json'
import ms from '../src/renderer/src/i18n/locales/ms.json'
import id from '../src/renderer/src/i18n/locales/id.json'
import ja from '../src/renderer/src/i18n/locales/ja.json'

const locales: Record<string, Record<string, string>> = { 'zh-TW': zhTW, 'zh-CN': zhCN, en, ms, id, ja }

describe('i18n locale completeness', () => {
  const referenceKeys = Object.keys(zhTW).sort()

  it('has at least one key', () => {
    expect(referenceKeys.length).toBeGreaterThan(0)
  })

  for (const [locale, dict] of Object.entries(locales)) {
    it(`${locale} has exactly the same keys as zh-TW (the reference locale)`, () => {
      const keys = Object.keys(dict).sort()
      const missing = referenceKeys.filter((k) => !keys.includes(k))
      const extra = keys.filter((k) => !referenceKeys.includes(k))
      expect({ missing, extra }).toEqual({ missing: [], extra: [] })
    })

    it(`${locale} has no empty translation values`, () => {
      const empties = Object.entries(dict).filter(([, v]) => typeof v !== 'string' || v.trim().length === 0)
      expect(empties).toEqual([])
    })
  }
})
