import type { KigomboApi } from './index'

declare global {
  interface Window {
    api: KigomboApi
  }
}

export {}
