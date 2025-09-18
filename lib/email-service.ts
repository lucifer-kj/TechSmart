import { 
  type EmailProvider,
  type EmailServiceConfig,
  type SendEmailRequest,
  type SendEmailResponse,
  type Email,
  type EmailTemplate,
  type EmailStatus,
  type EmailWebhookPayload,
  EmailServiceError,
  EmailValidationError,
  EmailProviderError,
  EmailQueueError,
  sendEmailRequestSchema,
  type WelcomeEmailData,
  type PasswordResetEmailData,
  type QuoteApprovalEmailData,
  type JobUpdateEmailData,
  type PaymentReminderEmailData,
  type DocumentNotificationEmailData,
  type InvitationEmailData,
} from '@/lib/types/email';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

class EmailService {
  private config: EmailServiceConfig;
  private providers: Map<EmailProvider, unknown> = new Map();
  private supabasePromise: ReturnType<typeof createServerSupabase>;

  constructor(config: EmailServiceConfig) {
    this.config = config;
    this.supabasePromise = createServerSupabase();
  }

  private async initializeProviders() {
    // Initialize other providers as needed (none eagerly initialized to avoid optional deps issues)
    // Initialize other providers as needed (none eagerly initialized to avoid optional deps issues)
  }

  /**
   * Send an email using the specified provider
   */
  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    void request;
    throw new EmailServiceError('Email service not implemented (pre-Phase 2 state)', 'NOT_IMPLEMENTED');
  }

  /**
   * Send email using template
   */
  async sendTemplateEmail(
    template: EmailTemplate,
    to: string | string[],
    templateData: Record<string, unknown>,
    options: Partial<SendEmailRequest> = {}
  ): Promise<SendEmailResponse> {
    void template;
    void to;
    void templateData;
    void options;
    throw new EmailServiceError('Email templates not implemented (pre-Phase 2 state)', 'NOT_IMPLEMENTED');
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    to: string,
    data: WelcomeEmailData
  ): Promise<SendEmailResponse> {
    return await this.sendTemplateEmail('welcome', to, data as unknown as Record<string, unknown>);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    data: PasswordResetEmailData
  ): Promise<SendEmailResponse> {
    return await this.sendTemplateEmail('password-reset', to, data as unknown as Record<string, unknown>);
  }

  /**
   * Send quote approval email
   */
  async sendQuoteApprovalEmail(
    to: string,
    data: QuoteApprovalEmailData
  ): Promise<SendEmailResponse> {
    return await this.sendTemplateEmail('quote-approval', to, data as unknown as Record<string, unknown>);
  }

  /**
   * Send job update email
   */
  async sendJobUpdateEmail(
    to: string,
    data: JobUpdateEmailData
  ): Promise<SendEmailResponse> {
    return await this.sendTemplateEmail('job-update', to, data as unknown as Record<string, unknown>);
  }

  /**
   * Send payment reminder email
   */
  async sendPaymentReminderEmail(
    to: string,
    data: PaymentReminderEmailData
  ): Promise<SendEmailResponse> {
    return await this.sendTemplateEmail('payment-reminder', to, data as unknown as Record<string, unknown>);
  }

  /**
   * Send document notification email
   */
  async sendDocumentNotificationEmail(
    to: string,
    data: DocumentNotificationEmailData
  ): Promise<SendEmailResponse> {
    return await this.sendTemplateEmail('document-notification', to, data as unknown as Record<string, unknown>);
  }

  /**
   * Send invitation email
   */
  async sendInvitationEmail(
    to: string,
    data: InvitationEmailData
  ): Promise<SendEmailResponse> {
    return await this.sendTemplateEmail('invitation', to, data as unknown as Record<string, unknown>);
  }

  /**
   * Send email via specific provider
   */
  private async sendViaProvider(email: Email, provider: EmailProvider): Promise<SendEmailResponse> {
    try {
      switch (provider) {
        case 'sendgrid':
          return await this.sendViaSendGrid(email);
        case 'ses':
          return await this.sendViaSES(email);
        case 'nodemailer':
          return await this.sendViaNodemailer(email);
        default:
          throw new EmailProviderError(`Unsupported provider: ${provider}`, provider, null);
      }
    } catch (error) {
      console.error(`Provider ${provider} error:`, error);
      throw new EmailProviderError(
        error instanceof Error ? error.message : 'Provider error',
        provider,
        error
      );
    }
  }

  // Resend provider intentionally unsupported in this build to avoid optional dependency issues

  /**
   * Send email via SendGrid (placeholder)
   */
  private async sendViaSendGrid(_email: Email): Promise<SendEmailResponse> {
    void _email;
    throw new EmailProviderError('Email providers not implemented (pre-Phase 2 state)', 'sendgrid', null);
  }

  /**
   * Send email via AWS SES (placeholder)
   */
  private async sendViaSES(_email: Email): Promise<SendEmailResponse> {
    void _email;
    throw new EmailProviderError('Email providers not implemented (pre-Phase 2 state)', 'ses', null);
  }

  /**
   * Send email via Nodemailer (placeholder)
   */
  private async sendViaNodemailer(_email: Email): Promise<SendEmailResponse> {
    void _email;
    throw new EmailProviderError('Email providers not implemented (pre-Phase 2 state)', 'nodemailer', null);
  }

  /**
   * Create email record in database
   */
  private async createEmailRecord(request: SendEmailRequest, provider: EmailProvider): Promise<Email> {
    void request;
    void provider;
    throw new EmailServiceError('Email persistence not implemented (pre-Phase 2 state)', 'NOT_IMPLEMENTED');
  }

  /**
   * Update email record in database
   */
  private async updateEmailRecord(emailId: string, updates: Partial<Email>): Promise<void> {
    void emailId;
    void updates;
    return; // no-op in pre-Phase 2
  }

  /**
   * Render email template
   */
  private async renderTemplate(template: EmailTemplate, data: Record<string, unknown>): Promise<string> {
    void template;
    void data;
    throw new EmailServiceError('Template rendering not implemented (pre-Phase 2 state)', 'NOT_IMPLEMENTED');
  }

  /**
   * Get template subject
   */
  private getTemplateSubject(template: EmailTemplate, data: Record<string, unknown>): string {
    const subjects: Record<EmailTemplate, string> = {
      'welcome': `Welcome to ${data.companyName || 'SmartTech'}!`,
      'password-reset': 'Reset Your Password',
      'quote-approval': `Quote Approval Required - ${data.quoteNumber || 'Quote'}`,
      'job-update': `Job Update - ${data.jobNumber || 'Job'}`,
      'payment-reminder': `Payment Reminder - ${data.invoiceNumber || 'Invoice'}`,
      'document-notification': `New Document - ${data.documentName || 'Document'}`,
      'invitation': `You're Invited to ${data.companyName || 'SmartTech'}`,
      'account-deactivated': 'Account Deactivated',
      'password-changed': 'Password Changed Successfully',
    };

    return subjects[template] || 'Notification';
  }

  /**
   * Get default template HTML
   */
  private getDefaultTemplate(template: EmailTemplate, data: Record<string, unknown>): string {
    const baseTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${this.getTemplateSubject(template, data)}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SmartTech Customer Portal</h1>
            </div>
            <div class="content">
              ${this.getTemplateContent(template, data)}
            </div>
            <div class="footer">
              <p>This email was sent from SmartTech Customer Portal.</p>
              <p>If you have any questions, contact us at ${data.supportEmail || 'support@smarttech.com'}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return baseTemplate;
  }

  /**
   * Get template content based on type
   */
  private getTemplateContent(template: EmailTemplate, data: Record<string, unknown>): string {
    switch (template) {
      case 'welcome':
        return `
          <h2>Welcome, ${data.userName}!</h2>
          <p>Thank you for joining ${data.companyName}. Your account has been successfully created.</p>
          <p>You can now access your customer portal and manage your jobs, documents, and payments.</p>
          <a href="${data.loginUrl}" class="button">Access Your Portal</a>
        `;

      case 'password-reset':
        return `
          <h2>Password Reset Request</h2>
          <p>Hello ${data.userName},</p>
          <p>You requested to reset your password. Click the button below to create a new password:</p>
          <a href="${data.resetUrl}" class="button">Reset Password</a>
          <p>This link will expire in ${data.expiresIn}.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `;

      case 'quote-approval':
        return `
          <h2>Quote Approval Required</h2>
          <p>Hello ${data.userName},</p>
          <p>You have a quote that requires your approval:</p>
          <ul>
            <li><strong>Quote Number:</strong> ${data.quoteNumber}</li>
            <li><strong>Amount:</strong> ${data.amount}</li>
            <li><strong>Expires:</strong> ${data.expiresAt}</li>
          </ul>
          <a href="${data.approvalUrl}" class="button">Review & Approve Quote</a>
        `;

      case 'job-update':
        return `
          <h2>Job Status Update</h2>
          <p>Hello ${data.userName},</p>
          <p>Your job has been updated:</p>
          <ul>
            <li><strong>Job Number:</strong> ${data.jobNumber}</li>
            <li><strong>Job Title:</strong> ${data.jobTitle}</li>
            <li><strong>Status:</strong> ${data.status}</li>
            <li><strong>Description:</strong> ${data.statusDescription}</li>
          </ul>
          <a href="${data.jobUrl}" class="button">View Job Details</a>
        `;

      case 'payment-reminder':
        return `
          <h2>Payment Reminder</h2>
          <p>Hello ${data.userName},</p>
          <p>This is a friendly reminder about your pending payment:</p>
          <ul>
            <li><strong>Invoice Number:</strong> ${data.invoiceNumber}</li>
            <li><strong>Amount:</strong> ${data.amount}</li>
            <li><strong>Due Date:</strong> ${data.dueDate}</li>
          </ul>
          <a href="${data.paymentUrl}" class="button">Make Payment</a>
        `;

      case 'document-notification':
        return `
          <h2>New Document Available</h2>
          <p>Hello ${data.userName},</p>
          <p>A new document has been uploaded for your review:</p>
          <ul>
            <li><strong>Document Name:</strong> ${data.documentName}</li>
            <li><strong>Document Type:</strong> ${data.documentType}</li>
          </ul>
          <a href="${data.documentUrl}" class="button">View Document</a>
        `;

      case 'invitation':
        return `
          <h2>You're Invited!</h2>
          <p>Hello ${data.userName},</p>
          <p>You've been invited to join ${data.companyName} customer portal.</p>
          <p>Click the button below to accept your invitation and set up your account:</p>
          <a href="${data.invitationUrl}" class="button">Accept Invitation</a>
          <p>This invitation will expire on ${data.expiresAt}.</p>
        `;

      default:
        return `
          <h2>Notification</h2>
          <p>You have received a notification from SmartTech Customer Portal.</p>
        `;
    }
  }

  /**
   * Process webhook from email provider
   */
  async processWebhook(payload: EmailWebhookPayload): Promise<void> {
    void payload;
    throw new EmailServiceError('Webhook processing not implemented (pre-Phase 2 state)', 'NOT_IMPLEMENTED');
  }
}

// Email service configuration
const emailConfig: EmailServiceConfig = {
  defaultProvider: 'nodemailer',
  providers: {
    resend: {
      provider: 'resend',
      apiKey: process.env.RESEND_API_KEY || '',
      fromEmail: process.env.EMAIL_FROM || 'noreply@smarttech.com',
      fromName: process.env.EMAIL_FROM_NAME || 'SmartTech',
      replyToEmail: process.env.EMAIL_REPLY_TO || 'support@smarttech.com',
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
    },
    sendgrid: {
      provider: 'sendgrid',
      apiKey: process.env.SENDGRID_API_KEY || '',
      fromEmail: process.env.EMAIL_FROM || 'noreply@smarttech.com',
      fromName: process.env.EMAIL_FROM_NAME || 'SmartTech',
      replyToEmail: process.env.EMAIL_REPLY_TO || 'support@smarttech.com',
    },
    ses: {
      provider: 'ses',
      apiKey: process.env.AWS_ACCESS_KEY_ID || '',
      fromEmail: process.env.EMAIL_FROM || 'noreply@smarttech.com',
      fromName: process.env.EMAIL_FROM_NAME || 'SmartTech',
      replyToEmail: process.env.EMAIL_REPLY_TO || 'support@smarttech.com',
      region: process.env.AWS_REGION || 'us-east-1',
    },
    nodemailer: {
      provider: 'nodemailer',
      apiKey: '',
      fromEmail: process.env.EMAIL_FROM || 'noreply@smarttech.com',
      fromName: process.env.EMAIL_FROM_NAME || 'SmartTech',
      replyToEmail: process.env.EMAIL_REPLY_TO || 'support@smarttech.com',
    },
  },
  queueEnabled: true,
  retryAttempts: 3,
  retryDelay: 5000, // 5 seconds
  batchSize: 10,
  rateLimit: {
    requests: 100,
    period: 60000, // 1 minute
  },
  templates: {
    baseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'es', 'fr'],
  },
};

// Create singleton instance
let emailServiceInstance: EmailService | null = null;

export async function getEmailService(): Promise<EmailService> {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService(emailConfig);
  }
  return emailServiceInstance;
}

// Export types and classes
export {
  EmailService,
  EmailServiceError,
  EmailValidationError,
  EmailProviderError,
  EmailQueueError,
};
