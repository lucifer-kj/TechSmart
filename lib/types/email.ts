import { z } from 'zod';

// Email service provider types
export type EmailProvider = 'resend' | 'sendgrid' | 'ses' | 'nodemailer';

// Email template types
export type EmailTemplate = 
  | 'welcome'
  | 'password-reset'
  | 'quote-approval'
  | 'job-update'
  | 'payment-reminder'
  | 'document-notification'
  | 'invitation'
  | 'account-deactivated'
  | 'password-changed';

// Email priority levels
export type EmailPriority = 'low' | 'normal' | 'high' | 'urgent';

// Email status tracking
export type EmailStatus = 
  | 'pending'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'failed'
  | 'cancelled';

// Base email interface
export interface Email {
  id: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from: string;
  replyTo?: string;
  subject: string;
  html?: string;
  text?: string;
  template?: EmailTemplate;
  templateData?: Record<string, unknown>;
  priority: EmailPriority;
  status: EmailStatus;
  provider: EmailProvider;
  providerId?: string;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

// Email send request
export interface SendEmailRequest {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  html?: string;
  text?: string;
  template?: EmailTemplate;
  templateData?: Record<string, unknown>;
  priority?: EmailPriority;
  scheduledAt?: Date;
  provider?: EmailProvider;
}

// Email send response
export interface SendEmailResponse {
  success: boolean;
  emailId?: string;
  providerId?: string;
  message?: string;
  error?: string;
}

// Email template data interfaces
export interface WelcomeEmailData {
  userName: string;
  companyName: string;
  loginUrl: string;
  supportEmail: string;
}

export interface PasswordResetEmailData {
  userName: string;
  resetUrl: string;
  expiresIn: string;
  supportEmail: string;
}

export interface QuoteApprovalEmailData {
  userName: string;
  quoteNumber: string;
  amount: string;
  approvalUrl: string;
  expiresAt: string;
  supportEmail: string;
}

export interface JobUpdateEmailData {
  userName: string;
  jobNumber: string;
  jobTitle: string;
  status: string;
  statusDescription: string;
  jobUrl: string;
  supportEmail: string;
}

export interface PaymentReminderEmailData {
  userName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  paymentUrl: string;
  supportEmail: string;
}

export interface DocumentNotificationEmailData {
  userName: string;
  documentName: string;
  documentType: string;
  documentUrl: string;
  supportEmail: string;
}

export interface InvitationEmailData {
  userName: string;
  companyName: string;
  invitationUrl: string;
  expiresAt: string;
  supportEmail: string;
}

// Email queue item
export interface EmailQueueItem {
  id: string;
  email: Email;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Email provider configuration
export interface EmailProviderConfig {
  provider: EmailProvider;
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  webhookSecret?: string;
  baseUrl?: string;
  region?: string;
}

// Email service configuration
export interface EmailServiceConfig {
  defaultProvider: EmailProvider;
  providers: Record<EmailProvider, EmailProviderConfig>;
  queueEnabled: boolean;
  retryAttempts: number;
  retryDelay: number;
  batchSize: number;
  rateLimit: {
    requests: number;
    period: number; // in milliseconds
  };
  templates: {
    baseUrl: string;
    defaultLanguage: string;
    supportedLanguages: string[];
  };
}

// Email analytics
export interface EmailAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalFailed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  period: {
    start: Date;
    end: Date;
  };
}

// Email webhook payload (for provider webhooks)
export interface EmailWebhookPayload {
  provider: EmailProvider;
  event: string;
  emailId: string;
  providerId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

// Zod schemas for validation
export const emailAddressSchema = z.string().email('Invalid email address');

export const sendEmailRequestSchema = z.object({
  to: z.union([
    emailAddressSchema,
    z.array(emailAddressSchema).min(1, 'At least one recipient required')
  ]),
  cc: z.union([
    emailAddressSchema,
    z.array(emailAddressSchema)
  ]).optional(),
  bcc: z.union([
    emailAddressSchema,
    z.array(emailAddressSchema)
  ]).optional(),
  from: emailAddressSchema.optional(),
  replyTo: emailAddressSchema.optional(),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  html: z.string().optional(),
  text: z.string().optional(),
  template: z.enum([
    'welcome',
    'password-reset',
    'quote-approval',
    'job-update',
    'payment-reminder',
    'document-notification',
    'invitation',
    'account-deactivated',
    'password-changed'
  ]).optional(),
  templateData: z.record(z.string(), z.unknown()).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  scheduledAt: z.date().optional(),
  provider: z.enum(['resend', 'sendgrid', 'ses', 'nodemailer']).optional(),
});

export const emailProviderConfigSchema = z.object({
  provider: z.enum(['resend', 'sendgrid', 'ses', 'nodemailer']),
  apiKey: z.string().min(1, 'API key is required'),
  fromEmail: emailAddressSchema,
  fromName: z.string().min(1, 'From name is required'),
  replyToEmail: emailAddressSchema.optional(),
  webhookSecret: z.string().optional(),
  baseUrl: z.string().url().optional(),
  region: z.string().optional(),
});

// Email template data schemas
export const welcomeEmailDataSchema = z.object({
  userName: z.string().min(1),
  companyName: z.string().min(1),
  loginUrl: z.string().url(),
  supportEmail: emailAddressSchema,
});

export const passwordResetEmailDataSchema = z.object({
  userName: z.string().min(1),
  resetUrl: z.string().url(),
  expiresIn: z.string().min(1),
  supportEmail: emailAddressSchema,
});

export const quoteApprovalEmailDataSchema = z.object({
  userName: z.string().min(1),
  quoteNumber: z.string().min(1),
  amount: z.string().min(1),
  approvalUrl: z.string().url(),
  expiresAt: z.string().min(1),
  supportEmail: emailAddressSchema,
});

export const jobUpdateEmailDataSchema = z.object({
  userName: z.string().min(1),
  jobNumber: z.string().min(1),
  jobTitle: z.string().min(1),
  status: z.string().min(1),
  statusDescription: z.string().min(1),
  jobUrl: z.string().url(),
  supportEmail: emailAddressSchema,
});

export const paymentReminderEmailDataSchema = z.object({
  userName: z.string().min(1),
  invoiceNumber: z.string().min(1),
  amount: z.string().min(1),
  dueDate: z.string().min(1),
  paymentUrl: z.string().url(),
  supportEmail: emailAddressSchema,
});

export const documentNotificationEmailDataSchema = z.object({
  userName: z.string().min(1),
  documentName: z.string().min(1),
  documentType: z.string().min(1),
  documentUrl: z.string().url(),
  supportEmail: emailAddressSchema,
});

export const invitationEmailDataSchema = z.object({
  userName: z.string().min(1),
  companyName: z.string().min(1),
  invitationUrl: z.string().url(),
  expiresAt: z.string().min(1),
  supportEmail: emailAddressSchema,
});

// Email service error types
export class EmailServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: EmailProvider,
    public providerError?: unknown
  ) {
    super(message);
    this.name = 'EmailServiceError';
  }
}

export class EmailValidationError extends EmailServiceError {
  constructor(message: string, public field: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'EmailValidationError';
  }
}

export class EmailProviderError extends EmailServiceError {
  constructor(
    message: string,
    provider: EmailProvider,
    providerError: unknown
  ) {
    super(message, 'PROVIDER_ERROR', provider, providerError);
    this.name = 'EmailProviderError';
  }
}

export class EmailQueueError extends EmailServiceError {
  constructor(message: string) {
    super(message, 'QUEUE_ERROR');
    this.name = 'EmailQueueError';
  }
}
