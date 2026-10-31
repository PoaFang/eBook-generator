import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhTW from './locales/zh-TW.json'
import en from './locales/en.json'

export const UI_LANGUAGES = [
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'en', label: 'English' }
] as const

i18n.use(initReactI18next).init({
  resources: {
    'zh-TW': { translation: zhTW },
    en: { translation: en }
  },
  lng: 'zh-TW',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
})

export default i18n
