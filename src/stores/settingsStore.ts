import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AppSettings {
  // Transcription settings
  // Model can be local ('tiny', 'base', 'small', 'medium', 'large')
  // or cloud ('openai-whisper', 'assemblyai-v1', etc)
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
  autoDeleteEnabled: boolean
  retentionDays: number | null  // null = never delete, number = days to keep
}

// Helper to determine if model is cloud-based
export function isCloudModel(modelName: string): boolean {
  return modelName.startsWith('openai-') ||
         modelName.startsWith('assemblyai-') ||
         modelName.startsWith('google-')
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
  autoDeleteEnabled: false,
  retentionDays: null,
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
