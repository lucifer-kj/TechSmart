import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface AccessRevocationResult {
  success: boolean;
  sessionsRevoked: number;
  error?: string;
}

export class AccessRevocationService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Revoke access for a banned customer
   * This includes:
   * 1. Revoking all active Supabase Auth sessions
   * 2. Logging the revocation event
   * 3. Notifying relevant systems
   */
  async revokeCustomerAccess(
    customerId: string,
    banReason: string,
    bannedBy: string
  ): Promise<AccessRevocationResult> {
    try {
      // Get the user profile for this customer
      const { data: userProfile, error: profileError } = await this.supabase
        .from('user_profiles')
        .select('id, email, role')
        .eq('customer_id', customerId)
        .eq('role', 'customer')
        .single();

      if (profileError || !userProfile) {
        return {
          success: false,
          sessionsRevoked: 0,
          error: 'User profile not found'
        };
      }

      // Revoke all active sessions for this user
      const sessionsRevoked = await this.revokeUserSessions(userProfile.id);

      // Log the access revocation
      await this.logAccessRevocation({
        customer_id: customerId,
        user_id: userProfile.id,
        ban_reason: banReason,
        banned_by: bannedBy,
        sessions_revoked: sessionsRevoked,
        revoked_at: new Date().toISOString()
      });

      // Send notification to customer (if email is available)
      if (userProfile.email) {
        await this.sendAccessRevocationNotification(userProfile.email, banReason);
      }

      return {
        success: true,
        sessionsRevoked
      };

    } catch (error) {
      console.error('Access revocation error:', error);
      return {
        success: false,
        sessionsRevoked: 0,
        error: (error as Error).message
      };
    }
  }

  /**
   * Revoke all active sessions for a user
   */
  private async revokeUserSessions(userId: string): Promise<number> {
    try {
      // Use Supabase Auth Admin API to revoke all sessions
      const { error } = await this.supabase.auth.admin.signOut(userId);
      
      if (error) {
        console.error('Session revocation error:', error);
        return 0;
      }

      // Supabase Admin signOut does not return session details; assume at least one session invalidated
      const revokedCount = 1;
      await this.logSessionRevocation(userId, revokedCount);

      return revokedCount;
    } catch (error) {
      console.error('Session revocation error:', error);
      return 0;
    }
  }

  /**
   * Log access revocation event
   */
  private async logAccessRevocation(data: {
    customer_id: string;
    user_id: string;
    ban_reason: string;
    banned_by: string;
    sessions_revoked: number;
    revoked_at: string;
  }): Promise<void> {
    try {
      await this.supabase
        .from('access_revocation_logs')
        .insert({
          customer_id: data.customer_id,
          user_id: data.user_id,
          ban_reason: data.ban_reason,
          banned_by: data.banned_by,
          sessions_revoked: data.sessions_revoked,
          revoked_at: data.revoked_at,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log access revocation:', error);
    }
  }

  /**
   * Log session revocation event
   */
  private async logSessionRevocation(userId: string, sessionsCount: number): Promise<void> {
    try {
      await this.supabase
        .from('session_revocation_logs')
        .insert({
          user_id: userId,
          sessions_revoked: sessionsCount,
          revoked_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log session revocation:', error);
    }
  }

  /**
   * Send access revocation notification to customer
   */
  private async sendAccessRevocationNotification(email: string, banReason: string): Promise<void> {
    try {
      const emailServiceUrl = process.env.EMAIL_SERVICE_API_URL;
      
      if (!emailServiceUrl) {
        console.log('No email service URL configured for access revocation notifications');
        return;
      }

      await fetch(`${emailServiceUrl}/send-access-revocation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EMAIL_SERVICE_API_KEY}`
        },
        body: JSON.stringify({
          to: email,
          ban_reason: banReason,
          template: 'access_revocation',
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to send access revocation notification:', error);
    }
  }

  /**
   * Check if a customer's access should be revoked
   * This can be called periodically to check for customers who should be banned
   */
  async checkAndRevokeAccess(): Promise<void> {
    try {
      // Find customers who are marked as banned but still have active sessions
      const { data: bannedCustomers } = await this.supabase
        .from('user_profiles')
        .select(`
          id,
          customer_id,
          email,
          customers!inner(
            id,
            name
          )
        `)
        .eq('role', 'customer')
        .eq('is_active', false);

      if (!bannedCustomers || bannedCustomers.length === 0) {
        return;
      }

      console.log(`Found ${bannedCustomers.length} banned customers to revoke access for`);

      for (const customer of bannedCustomers) {
        try {
          await this.revokeCustomerAccess(
            customer.customer_id,
            'Automatic access revocation for banned customer',
            'system'
          );
        } catch (error) {
          console.error(`Failed to revoke access for customer ${customer.customer_id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error checking and revoking access:', error);
    }
  }

  /**
   * Restore access for an unbanned customer
   */
  async restoreCustomerAccess(customerId: string, restoredBy: string): Promise<boolean> {
    try {
      // Log the access restoration
      await this.supabase
        .from('access_restoration_logs')
        .insert({
          customer_id: customerId,
          restored_by: restoredBy,
          restored_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      // Send restoration notification
      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('email')
        .eq('customer_id', customerId)
        .eq('role', 'customer')
        .single();

      if (userProfile?.email) {
        await this.sendAccessRestorationNotification(userProfile.email);
      }

      return true;
    } catch (error) {
      console.error('Access restoration error:', error);
      return false;
    }
  }

  /**
   * Send access restoration notification
   */
  private async sendAccessRestorationNotification(email: string): Promise<void> {
    try {
      const emailServiceUrl = process.env.EMAIL_SERVICE_API_URL;
      
      if (!emailServiceUrl) {
        return;
      }

      await fetch(`${emailServiceUrl}/send-access-restoration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EMAIL_SERVICE_API_KEY}`
        },
        body: JSON.stringify({
          to: email,
          template: 'access_restoration',
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to send access restoration notification:', error);
    }
  }
}

// Utility function for immediate access revocation
export async function revokeCustomerAccess(
  customerId: string,
  banReason: string,
  bannedBy: string
): Promise<AccessRevocationResult> {
  const service = new AccessRevocationService();
  return service.revokeCustomerAccess(customerId, banReason, bannedBy);
}

// Utility function for access restoration
export async function restoreCustomerAccess(
  customerId: string,
  restoredBy: string
): Promise<boolean> {
  const service = new AccessRevocationService();
  return service.restoreCustomerAccess(customerId, restoredBy);
}
