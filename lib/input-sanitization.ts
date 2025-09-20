import { NextRequest, NextResponse } from 'next/server';

export interface SanitizationConfig {
  maxLength?: number;
  allowedChars?: RegExp;
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'phone' | 'url' | 'json' | 'boolean';
  sanitizeHtml?: boolean;
}

export interface SanitizationResult {
  isValid: boolean;
  sanitizedValue: unknown;
  errors: string[];
  warnings: string[];
}

export class InputSanitizationService {
  /**
   * Sanitize a single input value
   */
  sanitizeInput(value: unknown, config: SanitizationConfig): SanitizationResult {
    // Accept unknown, narrow locally
    const inputValue: unknown = value;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if required field is missing
    if (config.required && (inputValue === null || inputValue === undefined || inputValue === '')) {
      errors.push('This field is required');
      return { isValid: false, sanitizedValue: inputValue, errors, warnings };
    }

    // Skip validation if value is empty and not required
    if (!config.required && (inputValue === null || inputValue === undefined || inputValue === '')) {
      return { isValid: true, sanitizedValue: inputValue, errors, warnings };
    }

    let sanitizedValue: unknown = inputValue;

    // Type-specific validation and sanitization
    switch (config.type) {
      case 'string':
        sanitizedValue = this.sanitizeString(String(inputValue));
        break;
      case 'number':
        sanitizedValue = this.sanitizeNumber(inputValue);
        break;
      case 'email':
        sanitizedValue = this.sanitizeEmail(String(inputValue));
        break;
      case 'phone':
        sanitizedValue = this.sanitizePhone(String(inputValue));
        break;
      case 'url':
        sanitizedValue = this.sanitizeUrl(String(inputValue));
        break;
      case 'json':
        sanitizedValue = this.sanitizeJson(inputValue);
        break;
      case 'boolean':
        sanitizedValue = this.sanitizeBoolean(inputValue);
        break;
      default:
        sanitizedValue = this.sanitizeString(String(inputValue));
    }

    // Length validation
    if (config.maxLength && typeof sanitizedValue !== 'undefined' && sanitizedValue !== null && sanitizedValue.toString().length > config.maxLength) {
      errors.push(`Value exceeds maximum length of ${config.maxLength} characters`);
    }

    // Character validation
    if (config.allowedChars && typeof sanitizedValue !== 'undefined' && sanitizedValue !== null && !config.allowedChars.test(sanitizedValue.toString())) {
      errors.push('Value contains invalid characters');
    }

    // HTML sanitization
    if (config.sanitizeHtml && typeof sanitizedValue === 'string') {
      sanitizedValue = this.sanitizeHtml(sanitizedValue);
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue,
      errors,
      warnings
    };
  }

  /**
   * Sanitize multiple inputs based on a schema
   */
  sanitizeInputs(inputs: Record<string, unknown>, schema: Record<string, SanitizationConfig>): {
    isValid: boolean;
    sanitizedInputs: Record<string, unknown>;
    errors: Record<string, string[]>;
    warnings: Record<string, string[]>;
  } {
    const sanitizedInputs: Record<string, unknown> = {};
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};
    let isValid = true;

    for (const [fieldName, config] of Object.entries(schema)) {
      const result = this.sanitizeInput(inputs[fieldName], config);
      
      sanitizedInputs[fieldName] = result.sanitizedValue;
      errors[fieldName] = result.errors;
      warnings[fieldName] = result.warnings;

      if (!result.isValid) {
        isValid = false;
      }
    }

    return {
      isValid,
      sanitizedInputs,
      errors,
      warnings
    };
  }

  /**
   * Sanitize request body for API endpoints
   */
  async sanitizeRequestBody(request: NextRequest, schema: Record<string, SanitizationConfig>): Promise<{
    isValid: boolean;
    sanitizedBody: unknown;
    errors: Record<string, string[]>;
    warnings: Record<string, string[]>;
  }> {
    try {
      const body = await request.json();
      const result = this.sanitizeInputs(body, schema);
      return {
        isValid: result.isValid,
        sanitizedBody: result.sanitizedInputs,
        errors: result.errors,
        warnings: result.warnings
      };
    } catch {
      return {
        isValid: false,
        sanitizedBody: null,
        errors: { body: ['Invalid JSON format'] },
        warnings: {}
      };
    }
  }

  // Private sanitization methods
  private sanitizeString(value: string): string {
    let sanitized = value.toString().trim();

    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Remove potential XSS vectors
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');

    return sanitized;
  }

  private sanitizeNumber(value: unknown): number {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    return isNaN(num) ? 0 : num;
  }

  private sanitizeEmail(value: string): string {
    const email = value.toString().trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    return email;
  }

  private sanitizePhone(value: string): string {
    // Remove all non-digit characters except + at the beginning
    let phone = value.toString().trim();
    phone = phone.replace(/[^\d+]/g, '');
    
    // Ensure + is only at the beginning
    if (phone.includes('+') && !phone.startsWith('+')) {
      phone = phone.replace(/\+/g, '');
    }

    return phone;
  }

  private sanitizeUrl(value: string): string {
    const url = value.toString().trim();
    
    try {
      const parsedUrl = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }

      return parsedUrl.toString();
    } catch {
      throw new Error('Invalid URL format');
    }
  }

  private sanitizeJson(value: unknown): unknown {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        throw new Error('Invalid JSON format');
      }
    }
    return value;
  }

  private sanitizeBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes' || lowerValue === 'on') {
        return true;
      }
      if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no' || lowerValue === 'off') {
        return false;
      }
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    return Boolean(value);
  }

  private sanitizeHtml(value: string): string {
    // Basic HTML sanitization - remove script tags and dangerous attributes
    let sanitized = value.toString();
    
    // Remove script tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove dangerous attributes
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*javascript\s*:/gi, '');
    sanitized = sanitized.replace(/\s*vbscript\s*:/gi, '');
    
    // Remove data URLs
    sanitized = sanitized.replace(/\s*data\s*:\s*text\/html/gi, '');
    
    return sanitized;
  }
}

// Predefined sanitization schemas for common forms
export const CustomerFormSchema: Record<string, SanitizationConfig> = {
  name: {
    type: 'string',
    required: true,
    maxLength: 255,
    allowedChars: /^[a-zA-Z0-9\s\-\.&'"]+$/
  },
  email: {
    type: 'email',
    required: false,
    maxLength: 255
  },
  phone: {
    type: 'phone',
    required: false,
    maxLength: 20
  },
  address: {
    type: 'string',
    required: false,
    maxLength: 500,
    sanitizeHtml: true
  },
  password: {
    type: 'string',
    required: false,
    maxLength: 255
  },
  confirmPassword: {
    type: 'string',
    required: false,
    maxLength: 255
  }
};

export const JobFormSchema: Record<string, SanitizationConfig> = {
  job_number: {
    type: 'string',
    required: true,
    maxLength: 50,
    allowedChars: /^[a-zA-Z0-9_-]+$/
  },
  description: {
    type: 'string',
    required: false,
    maxLength: 1000,
    sanitizeHtml: true
  },
  status: {
    type: 'string',
    required: true,
    allowedChars: /^(Quote|Work Order|Invoice|Complete|Cancelled)$/
  },
  generated_job_total: {
    type: 'number',
    required: false
  },
  job_address: {
    type: 'string',
    required: false,
    maxLength: 500,
    sanitizeHtml: true
  }
};

export const FeedbackFormSchema: Record<string, SanitizationConfig> = {
  feedback_text: {
    type: 'string',
    required: true,
    maxLength: 2000,
    sanitizeHtml: true
  },
  note_type: {
    type: 'string',
    required: false,
    maxLength: 50,
    allowedChars: /^[a-zA-Z0-9_-]+$/
  }
};

export const DocumentAcknowledgmentSchema: Record<string, SanitizationConfig> = {
  signature: {
    type: 'string',
    required: false,
    maxLength: 10000
  },
  notes: {
    type: 'string',
    required: false,
    maxLength: 1000,
    sanitizeHtml: true
  }
};

// Middleware function for API routes
export function withInputSanitization(schema: Record<string, SanitizationConfig>) {
  return function<TArgs extends unknown[], TResult>(handler: (request: NextRequest, ...args: TArgs) => Promise<TResult> | TResult) {
    return async function(request: NextRequest, ...args: TArgs) {
      const sanitizationService = new InputSanitizationService();
      
      try {
        const { isValid, sanitizedBody, errors } = await sanitizationService.sanitizeRequestBody(request, schema);
        
        if (!isValid) {
          return NextResponse.json({
            error: 'Input validation failed',
            details: errors
          }, { status: 400 });
        }

        // Replace the request body with sanitized data
        const sanitizedRequest = new NextRequest(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(sanitizedBody)
        });

        return handler(sanitizedRequest, ...args);
      } catch (error) {
        return NextResponse.json({
          error: 'Input sanitization failed',
          details: (error as Error).message
        }, { status: 400 });
      }
    };
  };
}

// Utility functions
export function sanitizeCustomerInput(input: Record<string, unknown>): SanitizationResult {
  const service = new InputSanitizationService();
  const result = service.sanitizeInputs(input, CustomerFormSchema);
  
  return {
    isValid: result.isValid,
    sanitizedValue: result.sanitizedInputs,
    errors: Object.values(result.errors).flat(),
    warnings: Object.values(result.warnings).flat()
  };
}

export function sanitizeJobInput(input: Record<string, unknown>): SanitizationResult {
  const service = new InputSanitizationService();
  const result = service.sanitizeInputs(input, JobFormSchema);
  
  return {
    isValid: result.isValid,
    sanitizedValue: result.sanitizedInputs,
    errors: Object.values(result.errors).flat(),
    warnings: Object.values(result.warnings).flat()
  };
}

export function sanitizeFeedbackInput(input: Record<string, unknown>): SanitizationResult {
  const service = new InputSanitizationService();
  const result = service.sanitizeInputs(input, FeedbackFormSchema);
  
  return {
    isValid: result.isValid,
    sanitizedValue: result.sanitizedInputs,
    errors: Object.values(result.errors).flat(),
    warnings: Object.values(result.warnings).flat()
  };
}
