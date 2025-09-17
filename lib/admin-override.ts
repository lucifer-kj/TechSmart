import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface AdminOverrideAction {
  id: string;
  action_type: 'bypass_rls' | 'force_access' | 'emergency_unban' | 'data_export' | 'bulk_operation';
  target_type: 'customer' | 'job' | 'document' | 'payment' | 'all';
  target_id?: string;
  reason: string;
  performed_by: string;
  performed_at: string;
  expires_at?: string;
  metadata?: Record<string, unknown>;
}

export class AdminOverrideService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Check if a user has admin override capabilities
   */
  async hasAdminOverrideAccess(userId: string): Promise<boolean> {
    try {
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('role, admin_override_enabled')
        .eq('id', userId)
        .single();

      return profile?.role === 'admin' && profile?.admin_override_enabled === true;
    } catch (error) {
      console.error('Error checking admin override access:', error);
      return false;
    }
  }

  /**
   * Log an admin override action
   */
  async logOverrideAction(action: Omit<AdminOverrideAction, 'id' | 'performed_at'>): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('admin_override_logs')
        .insert({
          action_type: action.action_type,
          target_type: action.target_type,
          target_id: action.target_id,
          reason: action.reason,
          performed_by: action.performed_by,
          performed_at: new Date().toISOString(),
          expires_at: action.expires_at,
          metadata: action.metadata ? JSON.stringify(action.metadata) : null,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error logging admin override action:', error);
      throw error;
    }
  }

  /**
   * Bypass RLS for a specific operation
   */
  async bypassRLSForOperation(
    userId: string,
    operation: string,
    targetType: string,
    targetId: string,
    reason: string
  ): Promise<boolean> {
    try {
      // Check if user has override access
      const hasAccess = await this.hasAdminOverrideAccess(userId);
      if (!hasAccess) {
        throw new Error('User does not have admin override access');
      }

      // Log the override action
      await this.logOverrideAction({
        action_type: 'bypass_rls',
        target_type: targetType as 'customer' | 'job' | 'document' | 'payment' | 'all',
        target_id: targetId,
        reason: reason,
        performed_by: userId,
        metadata: { operation }
      });

      return true;
    } catch (error) {
      console.error('Error bypassing RLS:', error);
      return false;
    }
  }

  /**
   * Force access to a banned customer's data
   */
  async forceAccessToBannedCustomer(
    userId: string,
    customerId: string,
    reason: string,
    expiresAt?: string
  ): Promise<boolean> {
    try {
      const hasAccess = await this.hasAdminOverrideAccess(userId);
      if (!hasAccess) {
        throw new Error('User does not have admin override access');
      }

      // Log the override action
      await this.logOverrideAction({
        action_type: 'force_access',
        target_type: 'customer',
        target_id: customerId,
        reason: reason,
        performed_by: userId,
        expires_at: expiresAt
      });

      return true;
    } catch (error) {
      console.error('Error forcing access to banned customer:', error);
      return false;
    }
  }

  /**
   * Emergency unban a customer
   */
  async emergencyUnbanCustomer(
    userId: string,
    customerId: string,
    reason: string
  ): Promise<boolean> {
    try {
      const hasAccess = await this.hasAdminOverrideAccess(userId);
      if (!hasAccess) {
        throw new Error('User does not have admin override access');
      }

      // Update customer status
      const { error: updateError } = await this.supabase
        .from('user_profiles')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('customer_id', customerId);

      if (updateError) throw updateError;

      // Log the override action
      await this.logOverrideAction({
        action_type: 'emergency_unban',
        target_type: 'customer',
        target_id: customerId,
        reason: reason,
        performed_by: userId
      });

      return true;
    } catch (error) {
      console.error('Error emergency unbanning customer:', error);
      return false;
    }
  }

  /**
   * Export customer data (bypassing normal restrictions)
   */
  async exportCustomerData(
    userId: string,
    customerId: string,
    reason: string,
    dataTypes: string[]
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const hasAccess = await this.hasAdminOverrideAccess(userId);
      if (!hasAccess) {
        return { success: false, error: 'User does not have admin override access' };
      }

      // Log the override action
      await this.logOverrideAction({
        action_type: 'data_export',
        target_type: 'customer',
        target_id: customerId,
        reason: reason,
        performed_by: userId,
        metadata: { data_types: dataTypes }
      });

      // Export the data (this would be implemented based on specific requirements)
      const exportData = await this.performDataExport(customerId, dataTypes);

      return { success: true, data: exportData };
    } catch (error) {
      console.error('Error exporting customer data:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Perform bulk operations with admin override
   */
  async performBulkOperation(
    userId: string,
    operation: string,
    targetIds: string[],
    reason: string
  ): Promise<{ success: boolean; results?: Array<{ targetId: string; success: boolean; result?: unknown; error?: string }> ; error?: string }> {
    try {
      const hasAccess = await this.hasAdminOverrideAccess(userId);
      if (!hasAccess) {
        return { success: false, error: 'User does not have admin override access' };
      }

      // Log the override action
      await this.logOverrideAction({
        action_type: 'bulk_operation',
        target_type: 'all',
        reason: reason,
        performed_by: userId,
        metadata: { operation, target_count: targetIds.length }
      });

      // Perform the bulk operation
      const results = await this.executeBulkOperation(operation, targetIds);

      return { success: true, results };
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get admin override history
   */
  async getOverrideHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AdminOverrideAction[]> {
    try {
      const hasAccess = await this.hasAdminOverrideAccess(userId);
      if (!hasAccess) {
        throw new Error('User does not have admin override access');
      }

      const { data, error } = await this.supabase
        .from('admin_override_logs')
        .select('*')
        .order('performed_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      type Row = {
        id: string;
        action_type: AdminOverrideAction['action_type'];
        target_type: AdminOverrideAction['target_type'];
        target_id: string | null;
        reason: string;
        performed_by: string;
        performed_at: string;
        expires_at: string | null;
        metadata: string | null;
      };
      return (data as Row[]).map((row) => ({
        id: row.id,
        action_type: row.action_type,
        target_type: row.target_type,
        target_id: row.target_id ?? undefined,
        reason: row.reason,
        performed_by: row.performed_by,
        performed_at: row.performed_at,
        expires_at: row.expires_at ?? undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      }));
    } catch (error) {
      console.error('Error getting override history:', error);
      return [];
    }
  }

  /**
   * Check if an override action is still valid (not expired)
   */
  async isOverrideValid(actionId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('admin_override_logs')
        .select('expires_at')
        .eq('id', actionId)
        .single();

      if (error || !data) return false;

      if (!data.expires_at) return true; // No expiration

      return new Date(data.expires_at) > new Date();
    } catch (error) {
      console.error('Error checking override validity:', error);
      return false;
    }
  }

  /**
   * Private method to perform data export
   */
  private async performDataExport(customerId: string, dataTypes: string[]): Promise<Record<string, unknown>> {
    const exportData: Record<string, unknown> = {};

    for (const dataType of dataTypes) {
      switch (dataType) {
        case 'customer':
          const { data: customer } = await this.supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single();
          exportData.customer = customer;
          break;

        case 'jobs':
          const { data: jobs } = await this.supabase
            .from('jobs')
            .select('*')
            .eq('customer_id', customerId);
          exportData.jobs = jobs;
          break;

        case 'payments':
          const { data: payments } = await this.supabase
            .from('payments')
            .select('*')
            .eq('customer_id', customerId);
          exportData.payments = payments;
          break;

        case 'feedback':
          const { data: feedback } = await this.supabase
            .from('customer_feedback')
            .select('*')
            .eq('customer_id', customerId);
          exportData.feedback = feedback;
          break;
      }
    }

    return exportData;
  }

  /**
   * Private method to execute bulk operations
   */
  private async executeBulkOperation(operation: string, targetIds: string[]): Promise<Array<{ targetId: string; success: boolean; result?: unknown; error?: string }>> {
    const results: Array<{ targetId: string; success: boolean; result?: unknown; error?: string }> = [];

    for (const targetId of targetIds) {
      try {
        let result;
        switch (operation) {
          case 'activate_customers':
            result = await this.supabase
              .from('user_profiles')
              .update({ is_active: true })
              .eq('customer_id', targetId);
            break;

          case 'deactivate_customers':
            result = await this.supabase
              .from('user_profiles')
              .update({ is_active: false })
              .eq('customer_id', targetId);
            break;

          default:
            result = { error: 'Unknown operation' };
        }

        results.push({ targetId, success: !result.error, result });
      } catch (error) {
        results.push({ targetId, success: false, error: (error as Error).message });
      }
    }

    return results;
  }
}

// Utility functions
export async function checkAdminOverrideAccess(userId: string): Promise<boolean> {
  const service = new AdminOverrideService();
  return service.hasAdminOverrideAccess(userId);
}

export async function logAdminOverrideAction(action: Omit<AdminOverrideAction, 'id' | 'performed_at'>): Promise<string> {
  const service = new AdminOverrideService();
  return service.logOverrideAction(action);
}
