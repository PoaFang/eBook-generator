import type { FayinApi } from '@shared/preloadApi'

declare global {
  interface Window {
    api: FayinApi
  }
}

export {}
