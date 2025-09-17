import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface AuditLogEntry {
  id?: string;
  user_id: string;
  action_type: string;
  resource_type: string;
  resource_id?: string;
  action_details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  success: boolean;
  error_message?: string;
}

export interface AuditLogQuery {
  user_id?: string;
  action_type?: string;
  resource_type?: string;
  resource_id?: string;
  start_date?: string;
  end_date?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}

export class AuditLoggingService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Log a user action
   */
  async logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .insert({
          user_id: entry.user_id,
          action_type: entry.action_type,
          resource_type: entry.resource_type,
          resource_id: entry.resource_id,
          action_details: JSON.stringify(entry.action_details),
          ip_address: entry.ip_address,
          user_agent: entry.user_agent,
          timestamp: new Date().toISOString(),
          success: entry.success,
          error_message: entry.error_message,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error logging audit action:', error);
      throw error;
    }
  }

  /**
   * Log customer creation
   */
  async logCustomerCreation(
    userId: string,
    customerId: string,
    customerData: { name?: string; email?: string; phone?: string; servicem8_uuid?: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    return this.logAction({
      user_id: userId,
      action_type: 'customer.create',
      resource_type: 'customer',
      resource_id: customerId,
      action_details: {
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_phone: customerData.phone,
        servicem8_uuid: customerData.servicem8_uuid
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true
    });
  }

  /**
   * Log customer ban
   */
  async logCustomerBan(
    userId: string,
    customerId: string,
    banReason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    return this.logAction({
      user_id: userId,
      action_type: 'customer.ban',
      resource_type: 'customer',
      resource_id: customerId,
      action_details: {
        ban_reason: banReason,
        action: 'ban'
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true
    });
  }

  /**
   * Log customer unban
   */
  async logCustomerUnban(
    userId: string,
    customerId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    return this.logAction({
      user_id: userId,
      action_type: 'customer.unban',
      resource_type: 'customer',
      resource_id: customerId,
      action_details: {
        action: 'unban'
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true
    });
  }

  /**
   * Log quote approval
   */
  async logQuoteApproval(
    userId: string,
    jobId: string,
    approvalData: { approval_date?: string; customer_signature?: string | null; notes?: string | null },
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    return this.logAction({
      user_id: userId,
      action_type: 'quote.approve',
      resource_type: 'job',
      resource_id: jobId,
      action_details: {
        approval_date: approvalData.approval_date,
        customer_signature: approvalData.customer_signature ? 'present' : 'absent',
        notes: approvalData.notes
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true
    });
  }

  /**
   * Log customer feedback submission
   */
  async logCustomerFeedback(
    userId: string,
    jobId: string,
    feedbackData: { feedback_text?: string; note_type?: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    return this.logAction({
      user_id: userId,
      action_type: 'feedback.submit',
      resource_type: 'job',
      resource_id: jobId,
      action_details: {
        feedback_length: feedbackData.feedback_text?.length || 0,
        note_type: feedbackData.note_type
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true
    });
  }

  /**
   * Log document acknowledgment
   */
  async logDocumentAcknowledgment(
    userId: string,
    documentId: string,
    acknowledgmentData: { signature?: string | null; notes?: string | null },
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    return this.logAction({
      user_id: userId,
      action_type: 'document.acknowledge',
      resource_type: 'document',
      resource_id: documentId,
      action_details: {
        signature_present: acknowledgmentData.signature ? 'yes' : 'no',
        notes: acknowledgmentData.notes
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true
    });
  }

  /**
   * Log user login
   */
  async logUserLogin(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    return this.logAction({
      user_id: userId,
      action_type: 'user.login',
      resource_type: 'user',
      resource_id: userId,
      action_details: {
        login_method: 'email_password'
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true
    });
  }

  /**
   * Log user logout
   */
  async logUserLogout(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    return this.logAction({
      user_id: userId,
      action_type: 'user.logout',
      resource_type: 'user',
      resource_id: userId,
      action_details: {},
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true
    });
  }

  /**
   * Log failed action
   */
  async logFailedAction(
    userId: string,
    actionType: string,
    resourceType: string,
    resourceId: string | undefined,
    errorMessage: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    return this.logAction({
      user_id: userId,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId,
      action_details: {},
      ip_address: ipAddress,
      user_agent: userAgent,
      success: false,
      error_message: errorMessage
    });
  }

  /**
   * Query audit logs
   */
  async queryAuditLogs(query: AuditLogQuery): Promise<AuditLogEntry[]> {
    try {
      let supabaseQuery = this.supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      // Apply filters
      if (query.user_id) {
        supabaseQuery = supabaseQuery.eq('user_id', query.user_id);
      }

      if (query.action_type) {
        supabaseQuery = supabaseQuery.eq('action_type', query.action_type);
      }

      if (query.resource_type) {
        supabaseQuery = supabaseQuery.eq('resource_type', query.resource_type);
      }

      if (query.resource_id) {
        supabaseQuery = supabaseQuery.eq('resource_id', query.resource_id);
      }

      if (query.start_date) {
        supabaseQuery = supabaseQuery.gte('timestamp', query.start_date);
      }

      if (query.end_date) {
        supabaseQuery = supabaseQuery.lte('timestamp', query.end_date);
      }

      if (query.success !== undefined) {
        supabaseQuery = supabaseQuery.eq('success', query.success);
      }

      // Apply pagination
      const limit = query.limit || 50;
      const offset = query.offset || 0;
      supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);

      const { data, error } = await supabaseQuery;

      if (error) throw error;

      type DBRow = {
        id: string;
        user_id: string;
        action_type: string;
        resource_type: string;
        resource_id?: string | null;
        action_details: string | null;
        ip_address?: string | null;
        user_agent?: string | null;
        timestamp: string;
        success: boolean;
        error_message?: string | null;
      };

      return (data as DBRow[]).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        action_type: row.action_type,
        resource_type: row.resource_type,
        resource_id: row.resource_id ?? undefined,
        action_details: JSON.parse(row.action_details || '{}'),
        ip_address: row.ip_address ?? undefined,
        user_agent: row.user_agent ?? undefined,
        timestamp: row.timestamp,
        success: row.success,
        error_message: row.error_message ?? undefined
      }));
    } catch (error) {
      console.error('Error querying audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(
    startDate?: string,
    endDate?: string
  ): Promise<{
    total_actions: number;
    successful_actions: number;
    failed_actions: number;
    unique_users: number;
    top_actions: Array<{ action_type: string; count: number }>;
    top_users: Array<{ user_id: string; count: number }>;
  }> {
    try {
      let query = this.supabase.from('audit_logs').select('*');

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }

      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const rows = data as Array<{ success: boolean; user_id: string; action_type: string }>;
      const total_actions = rows.length;
      const successful_actions = rows.filter((log) => log.success).length;
      const failed_actions = total_actions - successful_actions;
      const unique_users = new Set(rows.map((log) => log.user_id)).size;

      // Top actions
      const actionCounts: Record<string, number> = {};
      rows.forEach((log) => {
        actionCounts[log.action_type] = (actionCounts[log.action_type] || 0) + 1;
      });

      const top_actions = Object.entries(actionCounts)
        .map(([action_type, count]) => ({ action_type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Top users
      const userCounts: Record<string, number> = {};
      rows.forEach((log) => {
        userCounts[log.user_id] = (userCounts[log.user_id] || 0) + 1;
      });

      const top_users = Object.entries(userCounts)
        .map(([user_id, count]) => ({ user_id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        total_actions,
        successful_actions,
        failed_actions,
        unique_users,
        top_actions,
        top_users
      };
    } catch (error) {
      console.error('Error getting audit statistics:', error);
      return {
        total_actions: 0,
        successful_actions: 0,
        failed_actions: 0,
        unique_users: 0,
        top_actions: [],
        top_users: []
      };
    }
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(retentionDays: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const { data, error } = await this.supabase
        .from('audit_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())
        .select('id');

      if (error) throw error;

      return data?.length || 0;
    } catch (error) {
      console.error('Error cleaning up old audit logs:', error);
      return 0;
    }
  }
}

// Utility functions
export async function logCustomerCreation(
  userId: string,
  customerId: string,
  customerData: { name?: string; email?: string; phone?: string; servicem8_uuid?: string },
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const service = new AuditLoggingService();
  return service.logCustomerCreation(userId, customerId, customerData, ipAddress, userAgent);
}

export async function logCustomerBan(
  userId: string,
  customerId: string,
  banReason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const service = new AuditLoggingService();
  return service.logCustomerBan(userId, customerId, banReason, ipAddress, userAgent);
}

export async function logQuoteApproval(
  userId: string,
  jobId: string,
  approvalData: { approval_date?: string; customer_signature?: string | null; notes?: string | null },
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const service = new AuditLoggingService();
  return service.logQuoteApproval(userId, jobId, approvalData, ipAddress, userAgent);
}

export async function logCustomerFeedback(
  userId: string,
  jobId: string,
  feedbackData: { feedback_text?: string; note_type?: string },
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const service = new AuditLoggingService();
  return service.logCustomerFeedback(userId, jobId, feedbackData, ipAddress, userAgent);
}

export async function logDocumentAcknowledgment(
  userId: string,
  documentId: string,
  acknowledgmentData: { signature?: string | null; notes?: string | null },
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const service = new AuditLoggingService();
  return service.logDocumentAcknowledgment(userId, documentId, acknowledgmentData, ipAddress, userAgent);
}

export async function logFailedAction(
  userId: string,
  actionType: string,
  resourceType: string,
  resourceId: string | undefined,
  errorMessage: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const service = new AuditLoggingService();
  return service.logFailedAction(userId, actionType, resourceType, resourceId, errorMessage, ipAddress, userAgent);
}
