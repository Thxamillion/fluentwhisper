/**
 * Model Selection Guard
 * Ensures selectedModel in settings is always valid (installed)
 * Auto-resets to first installed model if selected model gets deleted
 */

import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useInstalledModels } from '@/hooks/models';
import { logger } from '@/services/logger'

export function ModelSelectionGuard() {
  const { settings, updateSetting } = useSettingsStore();
  const { data: installedModels, isLoading } = useInstalledModels();

  useEffect(() => {
    // Wait for data to load
    if (isLoading || !installedModels) return;

    // If no model selected AND models are installed, auto-select first one
    if (!settings.selectedModel && installedModels.length > 0) {
      const firstModel = installedModels[0].name;
      logger.info(`No model selected, auto-selecting: ${firstModel}`, 'ModelGuard');
      updateSetting('selectedModel', firstModel);
      return;
    }

    // Check if selected model is actually installed
    const isSelectedModelInstalled = installedModels.some(
      (m) => m.name === settings.selectedModel
    );

    if (!isSelectedModelInstalled) {
      logger.info(`Selected model "${settings.selectedModel}" not found. Auto-resetting...`, 'ModelGuard');

      // Selected model was deleted! Reset to first installed model
      if (installedModels.length > 0) {
        const firstModel = installedModels[0].name;
        logger.debug(`Switching to: ${firstModel}`, 'ModelGuard');
        updateSetting('selectedModel', firstModel);
      } else {
        // No models installed at all
        logger.debug('No models installed, clearing selection', 'ModelGuard');
        updateSetting('selectedModel', '');
      }
    }
  }, [settings.selectedModel, installedModels, isLoading, updateSetting]);

  // This component renders nothing
  return null;
}
