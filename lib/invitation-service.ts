import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { z } from 'zod';

export interface InvitationData {
  id: string;
  email: string;
  customer_id: string;
  invited_by: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInvitationData {
  email: string;
  customerId: string;
  invitedBy: string;
  expiresInDays?: number;
}

export interface InvitationStats {
  total: number;
  pending: number;
  used: number;
  expired: number;
}

const invitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  customerId: z.string().min(1, 'Customer ID is required'),
  expiresInDays: z.number().min(1).max(30).optional().default(7),
});

export class InvitationService {
  private supabase: Awaited<ReturnType<typeof createServerSupabase>>;

  constructor(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
    this.supabase = supabase;
  }

  /**
   * Create a new customer invitation
   */
  async createInvitation(data: CreateInvitationData): Promise<{ data: InvitationData | null; error: Error | null }> {
    try {
      const validatedData = invitationSchema.parse(data);
      
      // Check if invitation already exists for this email and customer
      const { data: existingInvitation } = await this.supabase
        .from('customer_invitations')
        .select('*')
        .eq('email', validatedData.email)
        .eq('customer_id', validatedData.customerId)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (existingInvitation) {
        return {
          data: null,
          error: new Error('An active invitation already exists for this email and customer')
        };
      }

      // Generate unique token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + validatedData.expiresInDays);

      // Create invitation
      const { data: invitation, error } = await this.supabase
        .from('customer_invitations')
        .insert({
          email: validatedData.email,
          customer_id: validatedData.customerId,
          invited_by: data.invitedBy,
          token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Log the invitation creation
      await this.supabase
        .from('audit_logs')
        .insert({
          action: 'invitation_created',
          user_id: data.invitedBy,
          details: { 
            email: validatedData.email, 
            customer_id: validatedData.customerId,
            expires_at: expiresAt.toISOString()
          },
        });

      return { data: invitation as InvitationData, error: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { data: null, error: new Error(error.issues?.[0]?.message || 'Invalid input') };
      }
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  /**
   * Verify an invitation token
   */
  async verifyInvitationToken(token: string): Promise<{ data: InvitationData | null; error: Error | null }> {
    try {
      const { data: invitation, error } = await this.supabase
        .from('customer_invitations')
        .select('*')
        .eq('token', token)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !invitation) {
        return { data: null, error: new Error('Invalid or expired invitation token') };
      }

      return { data: invitation as InvitationData, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  /**
   * Mark an invitation as used
   */
  async markInvitationAsUsed(token: string, userId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase
        .from('customer_invitations')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);

      if (error) {
        return { error: new Error(error.message) };
      }

      // Log the invitation usage
      await this.supabase
        .from('audit_logs')
        .insert({
          action: 'invitation_used',
          user_id: userId,
          details: { token },
        });

      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  /**
   * Get all invitations for a customer
   */
  async getCustomerInvitations(customerId: string): Promise<{ data: InvitationData[]; error: Error | null }> {
    try {
      const { data: invitations, error } = await this.supabase
        .from('customer_invitations')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], error: new Error(error.message) };
      }

      return { data: invitations as InvitationData[], error: null };
    } catch (error) {
      return { data: [], error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  /**
   * Get all invitations created by a user
   */
  async getUserInvitations(userId: string): Promise<{ data: InvitationData[]; error: Error | null }> {
    try {
      const { data: invitations, error } = await this.supabase
        .from('customer_invitations')
        .select('*')
        .eq('invited_by', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], error: new Error(error.message) };
      }

      return { data: invitations as InvitationData[], error: null };
    } catch (error) {
      return { data: [], error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  /**
   * Get invitation statistics
   */
  async getInvitationStats(): Promise<{ data: InvitationStats | null; error: Error | null }> {
    try {
      const { data: invitations, error } = await this.supabase
        .from('customer_invitations')
        .select('used_at, expires_at');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const now = new Date();
      const stats: InvitationStats = {
        total: invitations.length,
        pending: 0,
        used: 0,
        expired: 0,
      };

      invitations.forEach(invitation => {
        if (invitation.used_at) {
          stats.used++;
        } else if (new Date(invitation.expires_at) < now) {
          stats.expired++;
        } else {
          stats.pending++;
        }
      });

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  /**
   * Cancel/revoke an invitation
   */
  async cancelInvitation(invitationId: string, userId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase
        .from('customer_invitations')
        .update({ used_at: new Date().toISOString() }) // Mark as used to effectively cancel it
        .eq('id', invitationId)
        .is('used_at', null);

      if (error) {
        return { error: new Error(error.message) };
      }

      // Log the invitation cancellation
      await this.supabase
        .from('audit_logs')
        .insert({
          action: 'invitation_cancelled',
          user_id: userId,
          details: { invitation_id: invitationId },
        });

      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  /**
   * Resend an invitation (create new token for existing invitation)
   */
  async resendInvitation(invitationId: string, userId: string): Promise<{ data: InvitationData | null; error: Error | null }> {
    try {
      // Get the existing invitation
      const { data: existingInvitation, error: fetchError } = await this.supabase
        .from('customer_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (fetchError || !existingInvitation) {
        return { data: null, error: new Error('Invitation not found') };
      }

      // Generate new token and extend expiration
      const newToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      // Update the invitation
      const { data: updatedInvitation, error } = await this.supabase
        .from('customer_invitations')
        .update({
          token: newToken,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invitationId)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Log the invitation resend
      await this.supabase
        .from('audit_logs')
        .insert({
          action: 'invitation_resent',
          user_id: userId,
          details: { 
            invitation_id: invitationId,
            email: existingInvitation.email,
            customer_id: existingInvitation.customer_id
          },
        });

      return { data: updatedInvitation as InvitationData, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }
}

// Helper function to get invitation service instance
export async function getInvitationService() {
  const supabase = await createServerSupabase();
  return new InvitationService(supabase);
}
