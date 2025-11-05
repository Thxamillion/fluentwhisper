/**
 * System information types
 */

export interface SystemSpecs {
  /** Total RAM in GB */
  total_memory_gb: number;
  /** Number of CPU cores (physical + logical) */
  cpu_cores: number;
  /** CPU brand/model name (e.g., "Apple M1", "Intel i7") */
  cpu_brand: string;
  /** Recommended Whisper model based on system specs */
  recommended_model: string;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
