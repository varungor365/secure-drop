/**
 * Environment Configuration Utility
 * 
 * Provides type-safe access to environment variables with validation.
 * Centralizes all configuration management.
 */

interface AppConfig {
  isDevelopment: boolean;
  isProduction: boolean;
  apiUrl: string;
  enableLogging: boolean;
  maxFileSize: number;
  maxExportRetries: number;
}

/**
 * Validate and parse environment variables
 */
function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] || defaultValue;
  
  if (!value) {
    console.warn(`Environment variable ${key} not found and no default provided`);
    return "";
  }
  
  return String(value);
}

/**
 * Parse boolean environment variable
 */
function getEnvBoolean(key: string, defaultValue: boolean = false): boolean {
  const value = getEnvVar(key);
  if (!value) return defaultValue;
  return value === "true" || value === "1" || value === "yes";
}

/**
 * Parse numeric environment variable
 */
function getEnvNumber(key: string, defaultValue: number = 0): number {
  const value = getEnvVar(key);
  if (!value) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Get application configuration
 */
export function getConfig(): AppConfig {
  return {
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    apiUrl: getEnvVar("VITE_API_URL", "http://localhost:3000"),
    enableLogging: getEnvBoolean("VITE_ENABLE_LOGGING", import.meta.env.DEV),
    maxFileSize: getEnvNumber("VITE_MAX_FILE_SIZE", 100), // MB
    maxExportRetries: getEnvNumber("VITE_MAX_EXPORT_RETRIES", 3),
  };
}

/**
 * Validate configuration on startup
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = getConfig();

  if (!config.apiUrl) {
    errors.push("API URL is not configured");
  }

  if (config.maxFileSize <= 0) {
    errors.push("Max file size must be greater than 0");
  }

  if (config.maxExportRetries < 1) {
    errors.push("Max export retries must be at least 1");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Validate config on module load
if (import.meta.env.PROD) {
  const validation = validateConfig();
  if (!validation.valid) {
    console.error("Configuration validation failed:", validation.errors);
  }
}
