import { 
  type EmailTemplate,
  type WelcomeEmailData,
  type PasswordResetEmailData,
  type QuoteApprovalEmailData,
  type JobUpdateEmailData,
  type PaymentReminderEmailData,
  type DocumentNotificationEmailData,
  type InvitationEmailData,
} from '@/lib/types/email';
import { generateUnsubscribeUrl } from '@/app/api/notifications/unsubscribe/route';

export class EmailTemplateRenderer {
  private baseUrl: string;
  private defaultLanguage: string;

  constructor(baseUrl: string = 'http://localhost:3000', defaultLanguage: string = 'en') {
    this.baseUrl = baseUrl;
    this.defaultLanguage = defaultLanguage;
  }

  /**
   * Render email template with data
   */
  async renderTemplate(
    template: EmailTemplate,
    data: Record<string, unknown>,
    language: string = this.defaultLanguage
  ): Promise<string> {
    const templateContent = this.getTemplateContent(template, data, language);
    return this.wrapInBaseTemplate(templateContent, this.getTemplateSubject(template, data));
  }

  /**
   * Get template subject
   */
  getTemplateSubject(template: EmailTemplate, data: Record<string, unknown>): string {
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
   * Get template content based on type
   */
  private getTemplateContent(template: EmailTemplate, data: Record<string, unknown>, _language: string): string {
    void _language;
    switch (template) {
      case 'welcome':
        return this.renderWelcomeTemplate(data as unknown as WelcomeEmailData);
      case 'password-reset':
        return this.renderPasswordResetTemplate(data as unknown as PasswordResetEmailData);
      case 'quote-approval':
        return this.renderQuoteApprovalTemplate(data as unknown as QuoteApprovalEmailData);
      case 'job-update':
        return this.renderJobUpdateTemplate(data as unknown as JobUpdateEmailData);
      case 'payment-reminder':
        return this.renderPaymentReminderTemplate(data as unknown as PaymentReminderEmailData);
      case 'document-notification':
        return this.renderDocumentNotificationTemplate(data as unknown as DocumentNotificationEmailData);
      case 'invitation':
        return this.renderInvitationTemplate(data as unknown as InvitationEmailData);
      case 'account-deactivated':
        return this.renderAccountDeactivatedTemplate(data);
      case 'password-changed':
        return this.renderPasswordChangedTemplate(data);
      default:
        return this.renderDefaultTemplate(data);
    }
  }

  /**
   * Wrap content in base template
   */
  private wrapInBaseTemplate(content: string, subject: string, unsubscribeToken?: string, userEmail?: string): string {
    const unsubscribeLink = unsubscribeToken && userEmail 
      ? generateUnsubscribeUrl(unsubscribeToken, userEmail)
      : `${this.baseUrl}/unsubscribe`;

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            ${this.getBaseStyles()}
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="email-header">
              <div class="logo">
                <h1>SmartTech</h1>
                <p>Customer Portal</p>
              </div>
            </div>
            
            <div class="email-content">
              ${content}
            </div>
            
            <div class="email-footer">
              <div class="footer-content">
                <p>This email was sent from SmartTech Customer Portal.</p>
                <p>If you have any questions, contact us at <a href="mailto:support@smarttech.com">support@smarttech.com</a></p>
                <div class="footer-links">
                  <a href="${this.baseUrl}/profile">Manage Preferences</a> |
                  <a href="${this.baseUrl}/support">Support</a> |
                  <a href="${this.baseUrl}/privacy">Privacy Policy</a> |
                  <a href="${unsubscribeLink}">Unsubscribe</a>
                </div>
                <div class="unsubscribe-notice">
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-4">
                    You received this email because you have an account with SmartTech. 
                    <a href="${unsubscribeLink}" class="text-blue-600 dark:text-blue-400">Unsubscribe</a> 
                    to stop receiving these emails.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get base CSS styles
   */
  private getBaseStyles(): string {
    return `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333333;
        background-color: #f8fafc;
        margin: 0;
        padding: 0;
      }
      
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      
      .email-header {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: white;
        padding: 32px 24px;
        text-align: center;
      }
      
      .logo h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -0.5px;
      }
      
      .logo p {
        margin: 4px 0 0 0;
        font-size: 14px;
        opacity: 0.9;
      }
      
      .email-content {
        padding: 32px 24px;
        background-color: #ffffff;
      }
      
      .email-footer {
        background-color: #f8fafc;
        padding: 24px;
        border-top: 1px solid #e2e8f0;
      }
      
      .footer-content {
        text-align: center;
        font-size: 14px;
        color: #64748b;
      }
      
      .footer-content p {
        margin: 8px 0;
      }
      
      .footer-links {
        margin-top: 16px;
      }
      
      .footer-links a {
        color: #2563eb;
        text-decoration: none;
        font-size: 13px;
      }
      
      .footer-links a:hover {
        text-decoration: underline;
      }
      
      h1, h2, h3 {
        color: #1e293b;
        margin-top: 0;
      }
      
      h2 {
        font-size: 24px;
        margin-bottom: 16px;
      }
      
      h3 {
        font-size: 18px;
        margin-bottom: 12px;
      }
      
      p {
        margin: 16px 0;
        font-size: 16px;
      }
      
      .button {
        display: inline-block;
        padding: 12px 24px;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 16px;
        margin: 16px 0;
        transition: transform 0.2s ease;
      }
      
      .button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
      }
      
      .button-secondary {
        background: #f1f5f9;
        color: #475569;
        border: 1px solid #e2e8f0;
      }
      
      .button-secondary:hover {
        background: #e2e8f0;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      
      .info-box {
        background-color: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 6px;
        padding: 16px;
        margin: 16px 0;
      }
      
      .warning-box {
        background-color: #fef3c7;
        border: 1px solid #fbbf24;
        border-radius: 6px;
        padding: 16px;
        margin: 16px 0;
      }
      
      .error-box {
        background-color: #fee2e2;
        border: 1px solid #f87171;
        border-radius: 6px;
        padding: 16px;
        margin: 16px 0;
      }
      
      .info-list {
        background-color: #f8fafc;
        border-radius: 6px;
        padding: 16px;
        margin: 16px 0;
      }
      
      .info-list ul {
        margin: 0;
        padding-left: 20px;
      }
      
      .info-list li {
        margin: 8px 0;
        font-size: 15px;
      }
      
      .info-list strong {
        color: #1e293b;
      }
      
      .divider {
        height: 1px;
        background-color: #e2e8f0;
        margin: 24px 0;
      }
      
      @media (max-width: 600px) {
        .email-container {
          margin: 0;
          border-radius: 0;
        }
        
        .email-header,
        .email-content,
        .email-footer {
          padding: 24px 16px;
        }
        
        .logo h1 {
          font-size: 24px;
        }
        
        h2 {
          font-size: 20px;
        }
        
        .button {
          display: block;
          text-align: center;
          margin: 16px 0;
        }
      }
    `;
  }

  /**
   * Render welcome email template
   */
  private renderWelcomeTemplate(data: WelcomeEmailData): string {
    return `
      <h2>Welcome to SmartTech, ${data.userName}!</h2>
      
      <p>Thank you for joining ${data.companyName}. Your account has been successfully created and you now have access to our customer portal.</p>
      
      <div class="info-box">
        <h3>What you can do:</h3>
        <ul>
          <li>View and track your jobs in real-time</li>
          <li>Access important documents and reports</li>
          <li>Manage your payments and invoices</li>
          <li>Communicate with our team</li>
          <li>Update your profile and preferences</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.loginUrl}" class="button">Access Your Portal</a>
      </div>
      
      <p>If you have any questions or need assistance, don't hesitate to contact our support team at <a href="mailto:${data.supportEmail}">${data.supportEmail}</a>.</p>
      
      <div class="divider"></div>
      
      <p style="font-size: 14px; color: #64748b;">
        <strong>Next steps:</strong> Log in to your portal and explore the features. You can update your profile, set notification preferences, and familiarize yourself with the interface.
      </p>
    `;
  }

  /**
   * Render password reset email template
   */
  private renderPasswordResetTemplate(data: PasswordResetEmailData): string {
    return `
      <h2>Password Reset Request</h2>
      
      <p>Hello ${data.userName},</p>
      
      <p>We received a request to reset your password for your SmartTech account. Click the button below to create a new password:</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.resetUrl}" class="button">Reset Password</a>
      </div>
      
      <div class="warning-box">
        <p><strong>Important:</strong> This link will expire in ${data.expiresIn}. For security reasons, please reset your password as soon as possible.</p>
      </div>
      
      <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
      
      <div class="divider"></div>
      
      <p style="font-size: 14px; color: #64748b;">
        <strong>Security tip:</strong> Choose a strong password with at least 8 characters, including uppercase and lowercase letters, numbers, and special characters.
      </p>
    `;
  }

  /**
   * Render quote approval email template
   */
  private renderQuoteApprovalTemplate(data: QuoteApprovalEmailData): string {
    return `
      <h2>Quote Approval Required</h2>
      
      <p>Hello ${data.userName},</p>
      
      <p>You have a quote that requires your review and approval:</p>
      
      <div class="info-list">
        <ul>
          <li><strong>Quote Number:</strong> ${data.quoteNumber}</li>
          <li><strong>Amount:</strong> ${data.amount}</li>
          <li><strong>Expires:</strong> ${data.expiresAt}</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.approvalUrl}" class="button">Review & Approve Quote</a>
      </div>
      
      <div class="info-box">
        <p><strong>What happens next?</strong> Once you approve the quote, we'll begin work on your project. You'll receive regular updates on the progress.</p>
      </div>
      
      <p>If you have any questions about this quote, please contact our team at <a href="mailto:${data.supportEmail}">${data.supportEmail}</a>.</p>
    `;
  }

  /**
   * Render job update email template
   */
  private renderJobUpdateTemplate(data: JobUpdateEmailData): string {
    return `
      <h2>Job Status Update</h2>
      
      <p>Hello ${data.userName},</p>
      
      <p>Your job has been updated with new information:</p>
      
      <div class="info-list">
        <ul>
          <li><strong>Job Number:</strong> ${data.jobNumber}</li>
          <li><strong>Job Title:</strong> ${data.jobTitle}</li>
          <li><strong>Status:</strong> ${data.status}</li>
          <li><strong>Description:</strong> ${data.statusDescription}</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.jobUrl}" class="button">View Job Details</a>
      </div>
      
      <p>You can track the progress of this job and access related documents through your customer portal.</p>
      
      <div class="divider"></div>
      
      <p style="font-size: 14px; color: #64748b;">
        <strong>Stay informed:</strong> You'll receive updates whenever there are changes to your job status.
      </p>
    `;
  }

  /**
   * Render payment reminder email template
   */
  private renderPaymentReminderTemplate(data: PaymentReminderEmailData): string {
    return `
      <h2>Payment Reminder</h2>
      
      <p>Hello ${data.userName},</p>
      
      <p>This is a friendly reminder about your pending payment:</p>
      
      <div class="info-list">
        <ul>
          <li><strong>Invoice Number:</strong> ${data.invoiceNumber}</li>
          <li><strong>Amount:</strong> ${data.amount}</li>
          <li><strong>Due Date:</strong> ${data.dueDate}</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.paymentUrl}" class="button">Make Payment</a>
      </div>
      
      <div class="info-box">
        <p><strong>Payment methods:</strong> We accept all major credit cards, bank transfers, and other secure payment methods through our portal.</p>
      </div>
      
      <p>If you have already made this payment or have any questions, please contact us at <a href="mailto:${data.supportEmail}">${data.supportEmail}</a>.</p>
    `;
  }

  /**
   * Render document notification email template
   */
  private renderDocumentNotificationTemplate(data: DocumentNotificationEmailData): string {
    return `
      <h2>New Document Available</h2>
      
      <p>Hello ${data.userName},</p>
      
      <p>A new document has been uploaded and is ready for your review:</p>
      
      <div class="info-list">
        <ul>
          <li><strong>Document Name:</strong> ${data.documentName}</li>
          <li><strong>Document Type:</strong> ${data.documentType}</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.documentUrl}" class="button">View Document</a>
      </div>
      
      <p>You can download, view, and manage this document through your customer portal.</p>
      
      <div class="divider"></div>
      
      <p style="font-size: 14px; color: #64748b;">
        <strong>Document security:</strong> All documents are securely stored and can only be accessed by authorized users.
      </p>
    `;
  }

  /**
   * Render invitation email template
   */
  private renderInvitationTemplate(data: InvitationEmailData): string {
    return `
      <h2>You're Invited!</h2>
      
      <p>Hello ${data.userName},</p>
      
      <p>You've been invited to join ${data.companyName} customer portal. This portal will give you access to:</p>
      
      <div class="info-box">
        <ul>
          <li>Real-time job tracking and updates</li>
          <li>Document management and sharing</li>
          <li>Payment processing and invoice management</li>
          <li>Direct communication with our team</li>
          <li>Account management and preferences</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.invitationUrl}" class="button">Accept Invitation</a>
      </div>
      
      <div class="warning-box">
        <p><strong>Important:</strong> This invitation will expire on ${data.expiresAt}. Please accept it as soon as possible to set up your account.</p>
      </div>
      
      <p>If you have any questions about this invitation, contact us at <a href="mailto:${data.supportEmail}">${data.supportEmail}</a>.</p>
    `;
  }

  /**
   * Render account deactivated email template
   */
  private renderAccountDeactivatedTemplate(data: Record<string, unknown>): string {
    return `
      <h2>Account Deactivated</h2>
      
      <p>Hello ${data.userName || 'User'},</p>
      
      <p>Your SmartTech customer portal account has been deactivated as requested.</p>
      
      <div class="info-box">
        <p><strong>What this means:</strong></p>
        <ul>
          <li>You will no longer receive email notifications</li>
          <li>You cannot access the customer portal</li>
          <li>All your data remains secure and will be retained according to our data retention policy</li>
        </ul>
      </div>
      
      <p>If you change your mind or need to reactivate your account, please contact our support team at <a href="mailto:support@smarttech.com">support@smarttech.com</a>.</p>
      
      <div class="divider"></div>
      
      <p style="font-size: 14px; color: #64748b;">
        Thank you for using SmartTech Customer Portal. We hope to serve you again in the future.
      </p>
    `;
  }

  /**
   * Render password changed email template
   */
  private renderPasswordChangedTemplate(data: Record<string, unknown>): string {
    return `
      <h2>Password Changed Successfully</h2>
      
      <p>Hello ${data.userName || 'User'},</p>
      
      <p>Your password has been successfully changed for your SmartTech account.</p>
      
      <div class="info-box">
        <p><strong>Security information:</strong></p>
        <ul>
          <li>Password changed on: ${new Date().toLocaleDateString()}</li>
          <li>Your account remains secure</li>
          <li>All active sessions have been maintained</li>
        </ul>
      </div>
      
      <p>If you did not make this change, please contact our support team immediately at <a href="mailto:support@smarttech.com">support@smarttech.com</a>.</p>
      
      <div class="divider"></div>
      
      <p style="font-size: 14px; color: #64748b;">
        <strong>Security tip:</strong> Always use a strong, unique password and never share your login credentials with anyone.
      </p>
    `;
  }

  /**
   * Render default template
   */
  private renderDefaultTemplate(_data: Record<string, unknown>): string {
    void _data;
    return `
      <h2>Notification</h2>
      
      <p>You have received a notification from SmartTech Customer Portal.</p>
      
      <div class="info-box">
        <p>Please log in to your portal to view the full details of this notification.</p>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${this.baseUrl}/login" class="button">Access Portal</a>
      </div>
    `;
  }
}

// Create singleton instance
let templateRendererInstance: EmailTemplateRenderer | null = null;

export function getEmailTemplateRenderer(): EmailTemplateRenderer {
  if (!templateRendererInstance) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    templateRendererInstance = new EmailTemplateRenderer(baseUrl);
  }
  return templateRendererInstance;
}
