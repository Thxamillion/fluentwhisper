import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { ReactNode } from 'react'

/**
 * Theme Provider Component
 *
 * Wraps the app with next-themes provider to enable dark mode support.
 * Uses class-based dark mode (adds/removes 'dark' class on <html> element).
 *
 * Features:
 * - Automatic system theme detection
 * - Persists user preference in localStorage
 * - Prevents flash of unstyled content (FOUC)
 * - Supports Light, Dark, and System themes
 *
 * Usage:
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
