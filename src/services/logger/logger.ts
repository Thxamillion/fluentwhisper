/**
 * Lightweight logger for FluentWhisper
 *
 * Provides structured logging with debug mode support.
 * In production, only warnings and errors are logged by default.
 * Debug mode can be enabled via settings.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerConfig {
  debugMode: boolean
  prefix?: string
}

class Logger {
  private config: LoggerConfig = {
    debugMode: import.meta.env.DEV, // Enable debug in development by default
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean) {
    this.config.debugMode = enabled
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugEnabled(): boolean {
    return this.config.debugMode
  }

  /**
   * Format log message with timestamp and level
   */
  private format(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0] // HH:MM:SS
    const prefix = context ? `[${context}]` : ''
    return `${timestamp} ${level.toUpperCase().padEnd(5)} ${prefix} ${message}`
  }

  /**
   * Debug-level logging - only shown when debug mode is enabled
   * Use for detailed flow tracking, variable inspection, etc.
   */
  debug(message: string, context?: string, ...args: any[]) {
    if (!this.config.debugMode) return

    const formatted = this.format('debug', message, context)
    console.log(`\x1b[36m${formatted}\x1b[0m`, ...args) // Cyan
  }

  /**
   * Info-level logging - shown when debug mode is enabled
   * Use for important application events
   */
  info(message: string, context?: string, ...args: any[]) {
    if (!this.config.debugMode) return

    const formatted = this.format('info', message, context)
    console.log(`\x1b[32m${formatted}\x1b[0m`, ...args) // Green
  }

  /**
   * Warning-level logging - always shown
   * Use for recoverable errors, deprecations, etc.
   */
  warn(message: string, context?: string, ...args: any[]) {
    const formatted = this.format('warn', message, context)
    console.warn(`\x1b[33m${formatted}\x1b[0m`, ...args) // Yellow
  }

  /**
   * Error-level logging - always shown
   * Use for errors, exceptions, failures
   */
  error(message: string, context?: string, error?: any, ...args: any[]) {
    const formatted = this.format('error', message, context)

    if (error instanceof Error) {
      console.error(`\x1b[31m${formatted}\x1b[0m`, error.message, ...args)
      if (this.config.debugMode) {
        console.error(error.stack)
      }
    } else {
      console.error(`\x1b[31m${formatted}\x1b[0m`, error, ...args)
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export type for use in other files
export type { LogLevel }
