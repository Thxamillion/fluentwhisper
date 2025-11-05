/**
 * Model Selection Guard
 * Ensures selectedModel in settings is always valid (installed)
 * Auto-resets to first installed model if selected model gets deleted
 */

import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useInstalledModels } from '@/hooks/models';

export function ModelSelectionGuard() {
  const { settings, updateSetting } = useSettingsStore();
  const { data: installedModels, isLoading } = useInstalledModels();

  useEffect(() => {
    // Wait for data to load
    if (isLoading || !installedModels) return;

    // If no model selected, don't do anything
    if (!settings.selectedModel) return;

    // Check if selected model is actually installed
    const isSelectedModelInstalled = installedModels.some(
      (m) => m.name === settings.selectedModel
    );

    if (!isSelectedModelInstalled) {
      console.log(
        `[ModelGuard] Selected model "${settings.selectedModel}" not found. Auto-resetting...`
      );

      // Selected model was deleted! Reset to first installed model
      if (installedModels.length > 0) {
        const firstModel = installedModels[0].name;
        console.log(`[ModelGuard] Switching to: ${firstModel}`);
        updateSetting('selectedModel', firstModel);
      } else {
        // No models installed at all
        console.log('[ModelGuard] No models installed, clearing selection');
        updateSetting('selectedModel', '');
      }
    }
  }, [settings.selectedModel, installedModels, isLoading, updateSetting]);

  // This component renders nothing
  return null;
}
