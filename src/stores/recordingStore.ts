import { create } from 'zustand'

/**
 * Global recording state store
 *
 * This store maintains recording state globally across all components.
 * Unlike React Query hooks which create isolated state per component,
 * Zustand ensures all components (including Sidebar) see the same state.
 */

interface RecordingState {
  // Core recording state
  isRecording: boolean

  // Actions
  setIsRecording: (value: boolean) => void
}

export const useRecordingStore = create<RecordingState>((set) => ({
  // Initial state
  isRecording: false,

  // Actions
  setIsRecording: (value) => set({ isRecording: value }),
}))
