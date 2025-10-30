import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AppSettings {
  // Transcription settings
  useCloudTranscription: boolean
  whisperModel: string

  // Audio settings
  defaultMicrophone: string
  audioQuality: 'high' | 'medium' | 'low'
  noiseReduction: boolean

  // Language settings
  primaryLanguage: string
  targetLanguage: string
}

interface SettingsState {
  settings: AppSettings
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  resetSettings: () => void
}

const defaultSettings: AppSettings = {
  // Cloud transcription OFF by default (will be enabled for premium users via UI)
  useCloudTranscription: false,
  whisperModel: 'base',

  defaultMicrophone: 'default',
  audioQuality: 'high',
  noiseReduction: true,

  primaryLanguage: 'en',
  targetLanguage: 'es',
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
