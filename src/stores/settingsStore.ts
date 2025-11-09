import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AppSettings {
  // Transcription settings
  // Local Whisper models: 'tiny', 'base', 'small', 'medium', 'large', 'large-v2', 'large-v3'
  selectedModel: string

  // Audio settings
  defaultMicrophone: string
  audioQuality: 'high' | 'medium' | 'low'
  noiseReduction: boolean

  // Language settings
  primaryLanguage: string
  targetLanguage: string

  // Practice settings
  dailyGoalMinutes: number

  // Privacy settings
  retentionDays: number | null  // null = never delete, number = days to keep
  analyticsEnabled: boolean  // Share anonymous usage data

  // Developer settings
  debugMode: boolean  // Enable debug logging
}

// Helper to determine if model is cloud-based (always false in OSS version)
export function isCloudModel(_modelName: string): boolean {
  return false // OSS version only supports local models
}

interface SettingsState {
  settings: AppSettings
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  resetSettings: () => void
}

const defaultSettings: AppSettings = {
  // Empty until user selects model during onboarding
  selectedModel: '',

  defaultMicrophone: 'default',
  audioQuality: 'high',
  noiseReduction: true,

  primaryLanguage: 'en',
  targetLanguage: 'es',

  dailyGoalMinutes: 15,

  // Privacy defaults - never delete by default
  retentionDays: null,
  analyticsEnabled: true, // Opt-in by default, user can disable in settings

  // Developer defaults - debug enabled in dev mode
  debugMode: import.meta.env.DEV,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      updateSetting: (key, value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [key]: value,
          },
        })),

      resetSettings: () =>
        set({ settings: defaultSettings }),
    }),
    {
      name: 'app-settings',
    }
  )
)
