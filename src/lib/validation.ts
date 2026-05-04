/**
 * Input Validation & Sanitization Utility
 * 
 * Provides security functions for:
 * - Sanitizing user input to prevent XSS
 * - Validating slide data integrity
 * - Escaping HTML content safely
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Validates and sanitizes slide data
 */
export function validateSlideData(data: unknown): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const slide = data as Record<string, unknown>;
  
  // Validate required fields
  if (typeof slide.title !== 'string' || slide.title.length > 500) {
    return false;
  }

  if (typeof slide.speaker !== 'string' || slide.speaker.length > 100) {
    return false;
  }

  if (typeof slide.notes !== 'string' || slide.notes.length > 5000) {
    return false;
  }

  return true;
}

/**
 * Sanitizes text content by removing potentially dangerous characters
 */
export function sanitizeText(text: string, maxLength: number = 1000): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .substring(0, maxLength)
    .trim()
    .replace(/[<>]/g, ''); // Remove angle brackets
}

/**
 * Validates file size before processing
 */
export function validateFileSize(
  file: File,
  maxSizeMB: number = 100
): { valid: boolean; error?: string } {
  const maxBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  return { valid: true };
}

/**
 * Validates MIME type
 */
export function validateMimeType(
  file: File,
  allowedTypes: string[]
): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not allowed`,
    };
  }

  return { valid: true };
}
