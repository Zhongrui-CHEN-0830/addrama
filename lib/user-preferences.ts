import type { AdFormat } from '@/types'

export interface UserAdPreferences {
  useful: boolean
  boring: boolean
  preferredCategories: string[]
  blockedCategories: string[]
  preferredFormats: AdFormat[]
  lastUpdatedAt: string
}

export const USER_AD_PREFERENCES_STORAGE_KEY = 'addrama_user_ad_preferences'

export const DEFAULT_USER_AD_PREFERENCES: UserAdPreferences = {
  useful: false,
  boring: false,
  preferredCategories: [],
  blockedCategories: [],
  preferredFormats: [],
  lastUpdatedAt: '',
}

const AD_FORMATS = new Set<AdFormat>([
  'short',
  'buffer-card',
  'character-match',
  'interactive',
  'drama-style',
  'end-card',
])

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function adFormatArray(value: unknown): AdFormat[] {
  return stringArray(value).filter((item): item is AdFormat => AD_FORMATS.has(item as AdFormat))
}

export function serializeUserAdPreferences(preferences: UserAdPreferences): string {
  return JSON.stringify(preferences)
}

export function parseUserAdPreferences(raw: string | null): UserAdPreferences {
  if (!raw) return DEFAULT_USER_AD_PREFERENCES

  try {
    const data = JSON.parse(raw) as Partial<UserAdPreferences>
    return {
      useful: Boolean(data.useful),
      boring: Boolean(data.boring),
      preferredCategories: stringArray(data.preferredCategories),
      blockedCategories: stringArray(data.blockedCategories),
      preferredFormats: adFormatArray(data.preferredFormats),
      lastUpdatedAt: typeof data.lastUpdatedAt === 'string' ? data.lastUpdatedAt : '',
    }
  } catch {
    return DEFAULT_USER_AD_PREFERENCES
  }
}
