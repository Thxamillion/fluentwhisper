/**
 * UpdateDialog Component - Prompts user to install available updates
 *
 * Shows update version, release notes, and install/dismiss actions.
 */

import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUpdateCheck, useInstallUpdate } from '@/hooks/useUpdater';

export function UpdateDialog() {
  const { data: updateInfo } = useUpdateCheck();
  const installUpdate = useInstallUpdate();
  const [isOpen, setIsOpen] = useState(false);

  // Show dialog when update is available
  useEffect(() => {
    if (updateInfo?.available) {
      setIsOpen(true);
    }
  }, [updateInfo]);

  const handleInstall = async () => {
    try {
      await installUpdate.mutateAsync();
      // App will relaunch automatically after successful install
    } catch (error) {
      console.error('Failed to install update:', error);
      // Toast notification could be shown here
      setIsOpen(false);
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
  };

  if (!updateInfo?.available) {
    return null;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update Available</AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-4">
              <div>
                <p className="text-sm">
                  Version <strong>{updateInfo.version}</strong> is now
                  available. You are currently using version{' '}
                  <strong>{updateInfo.currentVersion}</strong>.
                </p>
                {updateInfo.date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Released: {new Date(updateInfo.date).toLocaleDateString()}
                  </p>
                )}
              </div>

              {updateInfo.body && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">What's new:</p>
                  <div className="text-sm text-muted-foreground max-h-64 overflow-y-auto whitespace-pre-wrap">
                    {updateInfo.body}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                The app will restart after installing the update.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDismiss}>
            Later
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleInstall}
            disabled={installUpdate.isPending}
          >
            {installUpdate.isPending ? 'Installing...' : 'Install Update'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
