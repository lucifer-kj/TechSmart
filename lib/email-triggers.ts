// import { getEmailService } from './email-service';
import { getEmailTemplateRenderer } from './email-templates';
import { getNotificationPreferencesService } from './notification-preferences';
import { createClient as createServerSupabase } from './supabase/server';
import { 
  // type WelcomeEmailData,
  // type PasswordResetEmailData,
  // type QuoteApprovalEmailData,
  // type JobUpdateEmailData,
  // type PaymentReminderEmailData,
  // type DocumentNotificationEmailData,
  // type InvitationEmailData,
  type EmailTemplate,
} from './types/email';

export class EmailTriggerService {
  private supabase!: Awaited<ReturnType<typeof createServerSupabase>>;
  private emailService: unknown;
  private templateRenderer!: ReturnType<typeof getEmailTemplateRenderer>;

  constructor() {
    this.initializeServices();
  }

  private async initializeServices() {
    this.supabase = await createServerSupabase();
    this.emailService = {};
    this.templateRenderer = getEmailTemplateRenderer();
  }

  /**
   * Check if user has email notifications enabled
   */
  async shouldSendEmail(userId: string, emailType: string): Promise<boolean> {
    try {
      const preferencesService = await getNotificationPreferencesService();
      const notificationType = this.mapEmailTypeToNotificationType(emailType);
      
      const result = await preferencesService.shouldSendNotification(userId, notificationType, emailType);
      
      if (!result.shouldSend) {
        console.log(`Email not sent to user ${userId}: ${result.reason}`);
        return false;
      }

      return true;

    } catch (error) {
      console.error('Error checking email preferences:', error);
      return true; // Default to sending emails on error
    }
  }

  /**
   * Map email type to notification type
   */
  private mapEmailTypeToNotificationType(emailType: string): 'quotes' | 'payments' | 'job_updates' | 'documents' | 'invitations' | 'security' | 'marketing' {
    switch (emailType) {
      case 'quote-approval':
        return 'quotes';
      case 'payment-reminder':
        return 'payments';
      case 'job-update':
        return 'job_updates';
      case 'document-notification':
        return 'documents';
      case 'invitation':
        return 'invitations';
      case 'password-reset':
      case 'password-changed':
      case 'account-deactivated':
        return 'security';
      case 'welcome':
      default:
        return 'marketing';
    }
  }

  /**
   * Get user email and name for sending
   */
  private async getUserEmailInfo(userId: string): Promise<{ email: string; name: string } | null> {
    try {
      const { data: user, error } = await this.supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return null;
      }

      return {
        email: user.email,
        name: user.full_name || user.email.split('@')[0],
      };

    } catch (error) {
      console.error('Error getting user email info:', error);
      return null;
    }
  }

  /**
   * Send welcome email to new customer
   */
  async sendWelcomeEmail(customerId: string): Promise<boolean> {
    void customerId;
    console.warn('sendWelcomeEmail not implemented (pre-Phase 2 state)');
    return false;
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(userId: string, resetToken: string): Promise<boolean> {
    void userId;
    void resetToken;
    console.warn('sendPasswordResetEmail not implemented (pre-Phase 2 state)');
    return false;
  }

  /**
   * Send quote approval email
   */
  async sendQuoteApprovalEmail(quoteId: string, customerId: string): Promise<boolean> {
    void quoteId;
    void customerId;
    console.warn('sendQuoteApprovalEmail not implemented (pre-Phase 2 state)');
    return false;
  }

  /**
   * Send job update email
   */
  async sendJobUpdateEmail(jobId: string, customerId: string, status: string, description?: string): Promise<boolean> {
    void jobId;
    void customerId;
    void status;
    void description;
    console.warn('sendJobUpdateEmail not implemented (pre-Phase 2 state)');
    return false;
  }

  /**
   * Send payment reminder email
   */
  async sendPaymentReminderEmail(invoiceId: string, customerId: string): Promise<boolean> {
    void invoiceId;
    void customerId;
    console.warn('sendPaymentReminderEmail not implemented (pre-Phase 2 state)');
    return false;
  }

  /**
   * Send document notification email
   */
  async sendDocumentNotificationEmail(documentId: string, customerId: string): Promise<boolean> {
    void documentId;
    void customerId;
    console.warn('sendDocumentNotificationEmail not implemented (pre-Phase 2 state)');
    return false;
  }

  /**
   * Send invitation email
   */
  async sendInvitationEmail(invitationId: string): Promise<boolean> {
    void invitationId;
    console.warn('sendInvitationEmail not implemented (pre-Phase 2 state)');
    return false;
  }

  /**
   * Send account deactivated email
   */
  async sendAccountDeactivatedEmail(userId: string): Promise<boolean> {
    void userId;
    console.warn('sendAccountDeactivatedEmail not implemented (pre-Phase 2 state)');
    return false;
  }

  /**
   * Send password changed email
   */
  async sendPasswordChangedEmail(userId: string): Promise<boolean> {
    void userId;
    console.warn('sendPasswordChangedEmail not implemented (pre-Phase 2 state)');
    return false;
  }

  /**
   * Send bulk emails to multiple customers
   */
  async sendBulkEmail(
    customerIds: string[],
    template: EmailTemplate,
    templateData: Record<string, unknown>
  ): Promise<{ sent: number; failed: number }> {
    void customerIds;
    void template;
    void templateData;
    console.warn('sendBulkEmail not implemented (pre-Phase 2 state)');
    return { sent: 0, failed: 0 };
  }

  /**
   * Get customers by IDs
   */
  async getCustomersByIds(customerIds: string[]): Promise<{ id: string; email: string; full_name: string }[]> {
    const { data: customers, error } = await this.supabase
      .from('customers')
      .select('id, email, full_name')
      .in('id', customerIds);

    if (error || !customers) {
      throw new Error(`Failed to fetch customers: ${error?.message || 'Unknown error'}`);
    }

    return customers;
  }

  /**
   * Get email service instance
   */
  getEmailService() {
    return this.emailService;
  }
}

// Create singleton instance
let emailTriggerInstance: EmailTriggerService | null = null;

export async function getEmailTriggerService(): Promise<EmailTriggerService> {
  if (!emailTriggerInstance) {
    emailTriggerInstance = new EmailTriggerService();
  }
  return emailTriggerInstance;
}
