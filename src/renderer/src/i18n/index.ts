import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhTW from './locales/zh-TW.json'
import zhCN from './locales/zh-CN.json'
import en from './locales/en.json'
import ms from './locales/ms.json'
import id from './locales/id.json'
import ja from './locales/ja.json'

export const UI_LANGUAGES = [
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'en', label: 'English' },
  { code: 'ms', label: 'Bahasa Malaysia' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ja', label: '日本語' }
] as const

i18n.use(initReactI18next).init({
  resources: {
    'zh-TW': { translation: zhTW },
    'zh-CN': { translation: zhCN },
    en: { translation: en },
    ms: { translation: ms },
    id: { translation: id },
    ja: { translation: ja }
  },
  lng: 'zh-TW',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
})

export default i18n
