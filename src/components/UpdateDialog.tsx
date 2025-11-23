/**
 * UpdateDialog Component - Prompts user to install available updates
 *
 * Shows update version, release notes, install progress, and dismiss actions.
 * Used for both automatic update checks (on startup) and manual checks (from Settings).
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUpdateCheck, useInstallUpdate } from '@/hooks/useUpdater';
import { toast } from 'sonner';
import type { DownloadProgress } from '@/services/updater';

export function UpdateDialog() {
  const { data: updateInfo } = useUpdateCheck();
  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  const installUpdate = useInstallUpdate((progressData) => {
    setProgress(progressData);
  });

  // Show dialog when update is available
  useEffect(() => {
    if (updateInfo?.available) {
      setIsOpen(true);
    }
  }, [updateInfo]);

  const handleInstall = async () => {
    try {
      setProgress({ phase: 'downloading', percent: 0 });
      await installUpdate.mutateAsync();
      // App will relaunch automatically after successful install
    } catch (error) {
      toast.error('Failed to install update', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      setProgress(null);
      setIsOpen(false);
    }
  };

  const handleDismiss = () => {
    if (!progress) {
      setIsOpen(false);
    }
  };

  const getProgressMessage = () => {
    if (!progress) return null;

    switch (progress.phase) {
      case 'downloading':
        return `Downloading: ${progress.percent || 0}%`;
      case 'installing':
        return 'Installing update...';
      case 'restarting':
        return 'Restarting app...';
      case 'manual-restart':
        return 'Please restart the app manually to complete the update';
      default:
        return null;
    }
  };

  if (!updateInfo?.available) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !progress) {
          setIsOpen(false);
          setProgress(null);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {progress ? 'Installing Update' : 'Update Available'}
          </DialogTitle>
          <DialogDescription>
            {progress
              ? `Version ${updateInfo.version}`
              : `Version ${updateInfo.version} is now available. Would you like to download and install it?`}
          </DialogDescription>
        </DialogHeader>

        {/* Show release notes only if not installing */}
        {!progress && updateInfo.body && (
          <div className="py-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {updateInfo.body}
            </p>
          </div>
        )}

        {/* Show progress */}
        {progress && (
          <div className="py-4 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {getProgressMessage()}
                </span>
                {progress.phase === 'downloading' && (
                  <span className="font-medium">{progress.percent}%</span>
                )}
              </div>
              {progress.phase === 'downloading' && (
                <Progress value={progress.percent || 0} />
              )}
            </div>

            {progress.phase === 'manual-restart' && (
              <p className="text-sm text-amber-600 dark:text-amber-500">
                The update has been installed successfully. Please quit and
                reopen the app to complete the update.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {!progress ? (
            <>
              <Button variant="outline" onClick={handleDismiss}>
                Later
              </Button>
              <Button onClick={handleInstall} disabled={installUpdate.isPending}>
                Install Update
              </Button>
            </>
          ) : progress.phase === 'manual-restart' ? (
            <Button
              onClick={() => {
                setIsOpen(false);
                setProgress(null);
              }}
            >
              OK
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
