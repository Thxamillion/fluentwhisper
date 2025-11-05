/**
 * Toast notification utility
 *
 * Wrapper around Sonner for consistent toast notifications across the app.
 *
 * @example
 * ```typescript
 * import { toast } from '@/lib/toast';
 *
 * // Success toast
 * toast.success('Session saved!');
 *
 * // Error toast
 * toast.error('Failed to delete session');
 *
 * // Loading toast
 * const loadingId = toast.loading('Downloading model...');
 * // Later dismiss:
 * toast.dismiss(loadingId);
 *
 * // Promise toast (auto success/error)
 * toast.promise(
 *   downloadModel(),
 *   {
 *     loading: 'Downloading model...',
 *     success: 'Model downloaded!',
 *     error: 'Download failed',
 *   }
 * );
 * ```
 */

import { toast as sonnerToast } from 'sonner';

export const toast = {
  /**
   * Show a success toast notification
   */
  success: (message: string, options?: { duration?: number }) => {
    return sonnerToast.success(message, options);
  },

  /**
   * Show an error toast notification
   */
  error: (message: string, options?: { duration?: number }) => {
    return sonnerToast.error(message, options);
  },

  /**
   * Show a loading toast notification
   * Returns an ID that can be used to dismiss or update the toast
   */
  loading: (message: string) => {
    return sonnerToast.loading(message);
  },

  /**
   * Show an info toast notification
   */
  info: (message: string, options?: { duration?: number }) => {
    return sonnerToast.info(message, options);
  },

  /**
   * Show a warning toast notification
   */
  warning: (message: string, options?: { duration?: number }) => {
    return sonnerToast.warning(message, options);
  },

  /**
   * Handle promises with automatic loading/success/error states
   */
  promise: sonnerToast.promise,

  /**
   * Dismiss a specific toast by ID
   */
  dismiss: (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId);
  },

  /**
   * Custom toast with full control
   */
  custom: sonnerToast.custom,
};
