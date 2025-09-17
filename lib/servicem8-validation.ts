import { ServiceM8Job, ServiceM8Company, ServiceM8Attachment } from './servicem8';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: unknown;
}

export interface WebhookPayload {
  event_type: string;
  object_uuid: string;
  timestamp?: string;
  webhook_id?: string;
  data?: unknown;
}

export class ServiceM8ValidationService {
  /**
   * Validate ServiceM8 webhook payload
   */
  validateWebhookPayload(payload: unknown): ValidationResult {
    const p = payload as Record<string, unknown>;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!p.event_type) {
      errors.push('Missing required field: event_type');
    } else if (!this.isValidEventType(String(p.event_type))) {
      errors.push(`Invalid event_type: ${p.event_type}`);
    }

    if (!p.object_uuid) {
      errors.push('Missing required field: object_uuid');
    } else if (!this.isValidUUID(String(p.object_uuid))) {
      errors.push(`Invalid object_uuid format: ${p.object_uuid}`);
    }

    // Optional fields validation
    if (p.timestamp && !this.isValidTimestamp(String(p.timestamp))) {
      warnings.push(`Invalid timestamp format: ${p.timestamp}`);
    }

    if (p.webhook_id && !this.isValidWebhookId(String(p.webhook_id))) {
      warnings.push(`Invalid webhook_id format: ${p.webhook_id}`);
    }

    // Sanitize the payload
    const sanitizedData = this.sanitizeWebhookPayload(p);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData
    };
  }

  /**
   * Validate ServiceM8 job data
   */
  validateJobData(jobData: unknown): ValidationResult {
    const job = jobData as Partial<ServiceM8Job> & Record<string, unknown>;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!job.uuid) {
      errors.push('Missing required field: uuid');
    } else if (!this.isValidUUID(String(job.uuid))) {
      errors.push(`Invalid uuid format: ${job.uuid}`);
    }

    if (!job.job_number) {
      errors.push('Missing required field: job_number');
    } else if (!this.isValidJobNumber(String(job.job_number))) {
      warnings.push(`Job number format may be invalid: ${job.job_number}`);
    }

    if (!job.company_uuid) {
      errors.push('Missing required field: company_uuid');
    } else if (!this.isValidUUID(String(job.company_uuid))) {
      errors.push(`Invalid company_uuid format: ${job.company_uuid}`);
    }

    // Optional fields validation
    if (job.job_description && typeof job.job_description !== 'string') {
      errors.push('job_description must be a string');
    }

    if (job.status && !this.isValidJobStatus(String(job.status))) {
      errors.push(`Invalid job status: ${job.status}`);
    }

    if (job.generated_job_total !== undefined) {
      if (typeof job.generated_job_total !== 'number' || job.generated_job_total < 0) {
        errors.push('generated_job_total must be a non-negative number');
      }
    }

    if (job.job_address && typeof job.job_address !== 'string') {
      errors.push('job_address must be a string');
    }

    // Date validation
    if (job.date_created && !this.isValidTimestamp(String(job.date_created))) {
      errors.push(`Invalid date_created format: ${job.date_created}`);
    }

    if (job.date_last_modified && !this.isValidTimestamp(String(job.date_last_modified))) {
      errors.push(`Invalid date_last_modified format: ${job.date_last_modified}`);
    }

    if (job.date_completed && !this.isValidTimestamp(String(job.date_completed))) {
      errors.push(`Invalid date_completed format: ${job.date_completed}`);
    }

    // Sanitize the data
    const sanitizedData = this.sanitizeJobData(job);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData
    };
  }

  /**
   * Validate ServiceM8 company data
   */
  validateCompanyData(companyData: unknown): ValidationResult {
    const company = companyData as Partial<ServiceM8Company> & Record<string, unknown>;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!company.uuid) {
      errors.push('Missing required field: uuid');
    } else if (!this.isValidUUID(String(company.uuid))) {
      errors.push(`Invalid uuid format: ${company.uuid}`);
    }

    if (!company.name) {
      errors.push('Missing required field: name');
    } else if (!this.isValidCompanyName(String(company.name))) {
      warnings.push(`Company name may contain invalid characters: ${company.name}`);
    }

    // Optional fields validation
    if (company.email && !this.isValidEmail(String(company.email))) {
      errors.push(`Invalid email format: ${company.email}`);
    }

    if (company.mobile && !this.isValidPhoneNumber(String(company.mobile))) {
      warnings.push(`Mobile number format may be invalid: ${company.mobile}`);
    }

    if (company.address && typeof company.address !== 'string') {
      errors.push('address must be a string');
    }

    if (company.active !== undefined) {
      if (typeof company.active !== 'number' || ![0, 1].includes(company.active)) {
        errors.push('active must be 0 or 1');
      }
    }

    // Sanitize the data
    const sanitizedData = this.sanitizeCompanyData(company);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData
    };
  }

  /**
   * Validate ServiceM8 attachment data
   */
  validateAttachmentData(attachmentData: unknown): ValidationResult {
    const attachment = attachmentData as Partial<ServiceM8Attachment> & Record<string, unknown>;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!attachment.uuid) {
      errors.push('Missing required field: uuid');
    } else if (!this.isValidUUID(String(attachment.uuid))) {
      errors.push(`Invalid uuid format: ${attachment.uuid}`);
    }

    if (!attachment.related_object_uuid) {
      errors.push('Missing required field: related_object_uuid');
    } else if (!this.isValidUUID(String(attachment.related_object_uuid))) {
      errors.push(`Invalid related_object_uuid format: ${attachment.related_object_uuid}`);
    }

    if (!attachment.file_name) {
      errors.push('Missing required field: file_name');
    } else if (!this.isValidFileName(String(attachment.file_name))) {
      errors.push(`Invalid file_name: ${attachment.file_name}`);
    }

    if (!attachment.file_type) {
      errors.push('Missing required field: file_type');
    } else if (!this.isValidFileType(String(attachment.file_type))) {
      warnings.push(`File type may be invalid: ${attachment.file_type}`);
    }

    if (!attachment.attachment_source) {
      errors.push('Missing required field: attachment_source');
    } else if (!this.isValidAttachmentSource(String(attachment.attachment_source))) {
      errors.push(`Invalid attachment_source: ${attachment.attachment_source}`);
    }

    if (attachment.file_size !== undefined) {
      if (typeof attachment.file_size !== 'number' || attachment.file_size < 0) {
        errors.push('file_size must be a non-negative number');
      }
    }

    // Sanitize the data
    const sanitizedData = this.sanitizeAttachmentData(attachment);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData
    };
  }

  /**
   * Validate user input for forms
   */
  validateUserInput(input: unknown, fieldType: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (fieldType) {
      case 'email':
        if (!input || typeof input !== 'string') {
          errors.push('Email is required and must be a string');
        } else if (!this.isValidEmail(input)) {
          errors.push('Invalid email format');
        }
        break;

      case 'phone':
        if (input && typeof input === 'string' && !this.isValidPhoneNumber(input)) {
          warnings.push('Phone number format may be invalid');
        }
        break;

      case 'name':
        if (!input || typeof input !== 'string') {
          errors.push('Name is required and must be a string');
        } else if (!this.isValidName(input)) {
          errors.push('Name contains invalid characters');
        }
        break;

      case 'text':
        if (input && typeof input !== 'string') {
          errors.push('Text field must be a string');
        } else if (input && typeof input === 'string' && this.containsMaliciousContent(input)) {
          errors.push('Text contains potentially malicious content');
        }
        break;

      case 'number':
        if (input !== undefined && (typeof input !== 'number' || isNaN(input))) {
          errors.push('Number field must be a valid number');
        }
        break;

      default:
        warnings.push(`Unknown field type: ${fieldType}`);
    }

    const sanitizedData = this.sanitizeUserInput(input as unknown, fieldType);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData
    };
  }

  // Private validation methods
  private isValidEventType(eventType: string): boolean {
    const validTypes = [
      'job.created', 'job.updated', 'job.deleted',
      'company.created', 'company.updated', 'company.deleted',
      'attachment.created', 'attachment.updated', 'attachment.deleted',
      'jobmaterial.created', 'jobmaterial.updated', 'jobmaterial.deleted',
      'payment.created', 'payment.updated', 'payment.deleted'
    ];
    return validTypes.includes(eventType);
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private isValidTimestamp(timestamp: string): boolean {
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  }

  private isValidWebhookId(webhookId: string): boolean {
    // ServiceM8 webhook IDs are typically alphanumeric strings
    return /^[a-zA-Z0-9_-]+$/.test(webhookId);
  }

  private isValidJobNumber(jobNumber: string): boolean {
    // Job numbers are typically alphanumeric with possible separators
    return /^[a-zA-Z0-9_-]+$/.test(jobNumber);
  }

  private isValidJobStatus(status: string): boolean {
    const validStatuses = ['Quote', 'Work Order', 'Invoice', 'Complete', 'Cancelled'];
    return validStatuses.includes(status);
  }

  private isValidCompanyName(name: string): boolean {
    // Company names should not contain special characters that could be malicious
    return /^[a-zA-Z0-9\s\-\.&'"]+$/.test(name) && name.length <= 255;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Allow various phone number formats
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  private isValidFileName(fileName: string): boolean {
    // File names should not contain path traversal or other dangerous characters
    return !/[<>:"|?*\x00-\x1f]/.test(fileName) && fileName.length <= 255;
  }

  private isValidFileType(fileType: string): boolean {
    // Allow common file types
    const validTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'csv'];
    return validTypes.includes(fileType.toLowerCase());
  }

  private isValidAttachmentSource(source: string): boolean {
    const validSources = ['Quote', 'Invoice', 'Photo', 'Document'];
    return validSources.includes(source);
  }

  private isValidName(name: string): boolean {
    // Names should not contain special characters that could be malicious
    return /^[a-zA-Z\s\-'\.]+$/.test(name) && name.length <= 100;
  }

  private containsMaliciousContent(text: string): boolean {
    // Check for common XSS and injection patterns
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /expression\s*\(/i,
      /vbscript:/i,
      /data:text\/html/i
    ];

    return maliciousPatterns.some(pattern => pattern.test(text));
  }

  // Sanitization methods
  private sanitizeWebhookPayload(payload: Record<string, unknown>): Record<string, unknown> {
    return {
      event_type: (payload.event_type as string | undefined)?.toString().trim(),
      object_uuid: (payload.object_uuid as string | undefined)?.toString().trim(),
      timestamp: (payload.timestamp as string | undefined)?.toString().trim(),
      webhook_id: (payload.webhook_id as string | undefined)?.toString().trim(),
      data: payload.data
    };
  }

  private sanitizeJobData(jobData: Partial<ServiceM8Job> & Record<string, unknown>): Partial<ServiceM8Job> & Record<string, unknown> {
    return {
      uuid: jobData.uuid?.toString().trim(),
      job_number: jobData.job_number?.toString().trim(),
      company_uuid: jobData.company_uuid?.toString().trim(),
      job_description: (jobData.job_description as string | undefined)?.toString().trim(),
      status:
        typeof jobData.status === 'string' && this.isValidJobStatus(jobData.status)
          ? (jobData.status as 'Quote' | 'Work Order' | 'Invoice' | 'Complete' | 'Cancelled')
          : undefined,
      generated_job_total: typeof jobData.generated_job_total === 'number' ? jobData.generated_job_total : 0,
      job_address: (jobData.job_address as string | undefined)?.toString().trim(),
      date_created: (jobData.date_created as string | undefined)?.toString().trim(),
      date_last_modified: (jobData.date_last_modified as string | undefined)?.toString().trim(),
      date_completed: (jobData.date_completed as string | undefined)?.toString().trim(),
      staff_uuid: (jobData.staff_uuid as string | undefined)?.toString().trim()
    };
  }

  private sanitizeCompanyData(companyData: Partial<ServiceM8Company> & Record<string, unknown>): Partial<ServiceM8Company> & Record<string, unknown> {
    return {
      uuid: companyData.uuid?.toString().trim(),
      name: companyData.name?.toString().trim(),
      email: (companyData.email as string | undefined)?.toString().trim().toLowerCase(),
      mobile: (companyData.mobile as string | undefined)?.toString().trim(),
      address: (companyData.address as string | undefined)?.toString().trim(),
      active: typeof companyData.active === 'number' ? companyData.active : 1,
      date_created: companyData.date_created?.toString().trim(),
      date_last_modified: companyData.date_last_modified?.toString().trim()
    };
  }

  private sanitizeAttachmentData(attachmentData: Partial<ServiceM8Attachment> & Record<string, unknown>): Partial<ServiceM8Attachment> & Record<string, unknown> {
    return {
      uuid: attachmentData.uuid?.toString().trim(),
      related_object_uuid: attachmentData.related_object_uuid?.toString().trim(),
      file_name: attachmentData.file_name?.toString().trim(),
      file_type: attachmentData.file_type?.toString().trim().toLowerCase(),
      attachment_source:
        typeof attachmentData.attachment_source === 'string' && this.isValidAttachmentSource(attachmentData.attachment_source)
          ? (attachmentData.attachment_source as 'Quote' | 'Invoice' | 'Photo' | 'Document')
          : undefined,
      file_size: typeof (attachmentData as { file_size?: number }).file_size === 'number' ? (attachmentData as { file_size?: number }).file_size : 0,
      date_created: attachmentData.date_created?.toString().trim()
    };
  }

  private sanitizeUserInput(input: unknown, fieldType: string): unknown {
    if (input === null || input === undefined) {
      return input;
    }

    switch (fieldType) {
      case 'email':
        return input.toString().trim().toLowerCase();
      case 'phone':
        return input.toString().trim();
      case 'name':
        return input.toString().trim();
      case 'text':
        return input.toString().trim();
      case 'number':
        return typeof input === 'number' ? input : parseFloat(String(input));
      default:
        return input;
    }
  }
}

// Utility functions
export function validateServiceM8Webhook(payload: unknown): ValidationResult {
  const validator = new ServiceM8ValidationService();
  return validator.validateWebhookPayload(payload);
}

export function validateServiceM8Job(jobData: unknown): ValidationResult {
  const validator = new ServiceM8ValidationService();
  return validator.validateJobData(jobData);
}

export function validateServiceM8Company(companyData: unknown): ValidationResult {
  const validator = new ServiceM8ValidationService();
  return validator.validateCompanyData(companyData);
}

export function validateServiceM8Attachment(attachmentData: unknown): ValidationResult {
  const validator = new ServiceM8ValidationService();
  return validator.validateAttachmentData(attachmentData);
}

export function validateUserInput(input: unknown, fieldType: string): ValidationResult {
  const validator = new ServiceM8ValidationService();
  return validator.validateUserInput(input, fieldType);
}
