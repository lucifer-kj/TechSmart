import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ServiceM8Client } from "@/lib/servicem8";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin (skip check in development mode with bypass)
  if (!(process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_AUTH === 'true')) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
  }

  try {
    // In development mode with bypass, return mock stats
    if (process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_AUTH === 'true') {
      const mockStats = {
        users: {
          total: 25,
          active: 22,
          banned: 3,
          new_this_month: 5
        },
        customers: {
          total: 18,
          with_portal_access: 15,
          servicem8_synced: 18
        },
        documents: {
          total: 156,
          pending_approval: 8,
          approved: 142,
          rejected: 6
        },
        jobs: {
          total: 89,
          active: 23,
          completed: 58,
          pending: 8
        },
        quotes: {
          total: 34,
          pending: 7,
          approved: 25,
          rejected: 2
        },
        feedback: {
          total: 67,
          this_month: 12,
          average_rating: 4.3
        },
        recent_activity: [
          {
            id: 1,
            type: 'user_login',
            description: 'John Smith logged in',
            timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
            user: 'John Smith'
          },
          {
            id: 2,
            type: 'quote_approved',
            description: 'Quote #ST-1001 approved by Jane Doe',
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            user: 'Jane Doe'
          },
          {
            id: 3,
            type: 'feedback_submitted',
            description: 'Mike Wilson submitted feedback for job ST-1003',
            timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            user: 'Mike Wilson'
          },
          {
            id: 4,
            type: 'customer_created',
            description: 'New customer Sarah Johnson created',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            user: 'Admin'
          },
          {
            id: 5,
            type: 'document_uploaded',
            description: 'Invoice uploaded for job ST-1005',
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            user: 'System'
          }
        ],
        servicem8_status: {
          connected: false,
          last_sync: null,
          error: 'Development mode - using mock data'
        }
      };

      return NextResponse.json(mockStats);
    }

    // Production stats gathering
    const stats: Record<string, unknown> = {
      users: {},
      customers: {},
      documents: {},
      jobs: {},
      quotes: {},
      feedback: {},
      recent_activity: [],
      servicem8_status: {}
    };

    // Get user stats
    const { data: userStats } = await supabase
      .from('user_profiles')
      .select('role, is_active, created_at')
      .order('created_at', { ascending: false });

    if (userStats) {
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      stats.users = {
        total: userStats.length,
        active: userStats.filter(u => u.is_active).length,
        banned: userStats.filter(u => !u.is_active).length,
        admins: userStats.filter(u => u.role === 'admin').length,
        customers: userStats.filter(u => u.role === 'customer').length,
        new_this_month: userStats.filter(u => new Date(u.created_at) >= thisMonth).length
      };
    }

    // Get customer stats
    const { data: customerStats } = await supabase
      .from('customers')
      .select(`
        id,
        servicem8_customer_uuid,
        created_at,
        user_profiles(id, is_active)
      `);

    if (customerStats) {
      stats.customers = {
        total: customerStats.length,
        with_portal_access: customerStats.filter(c => c.user_profiles && c.user_profiles.length > 0).length,
        servicem8_synced: customerStats.filter(c => c.servicem8_customer_uuid).length
      };
    }

    // Get job stats
    const { data: jobStats } = await supabase
      .from('jobs')
      .select('status, created_at');

    if (jobStats) {
      stats.jobs = {
        total: jobStats.length,
        active: jobStats.filter(j => ['Quote', 'Work Order'].includes(j.status)).length,
        completed: jobStats.filter(j => j.status === 'Complete').length,
        pending: jobStats.filter(j => j.status === 'Quote').length
      };
    }

    // Get document stats
    const { data: docStats } = await supabase
      .from('documents')
      .select('type, created_at');

    if (docStats) {
      stats.documents = {
        total: docStats.length,
        quotes: docStats.filter(d => d.type === 'quote').length,
        invoices: docStats.filter(d => d.type === 'invoice').length,
        photos: docStats.filter(d => d.type === 'photo').length,
        materials: docStats.filter(d => d.type === 'material').length
      };
    }

    // Get quote approval stats
    const { data: quoteStats } = await supabase
      .from('quotes')
      .select('status, created_at');

    if (quoteStats) {
      stats.quotes = {
        total: quoteStats.length,
        pending: quoteStats.filter(q => q.status === 'pending').length,
        approved: quoteStats.filter(q => q.status === 'approved').length,
        rejected: quoteStats.filter(q => q.status === 'rejected').length
      };
    }

    // Get recent activity from audit logs
    const { data: recentActivity } = await supabase
      .from('audit_logs')
      .select(`
        event,
        metadata,
        created_at,
        user_profiles(full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentActivity) {
      stats.recent_activity = recentActivity.map((activity, index) => ({
        id: index + 1,
        type: activity.event,
        description: formatActivityDescription(activity.event, activity.metadata),
        timestamp: activity.created_at,
        user: Array.isArray(activity.user_profiles) 
          ? (activity.user_profiles[0]?.full_name || activity.user_profiles[0]?.email || 'Unknown')
          : ((activity.user_profiles as { full_name?: string; email?: string } | null)?.full_name || 
             (activity.user_profiles as { full_name?: string; email?: string } | null)?.email || 'Unknown')
      }));
    }

    // Check ServiceM8 status
    const serviceM8Status = {
      connected: false,
      last_sync: null as string | null,
      error: null as string | null
    };

    if (process.env.SERVICEM8_API_KEY) {
      try {
        const serviceM8Client = new ServiceM8Client(process.env.SERVICEM8_API_KEY);
        // Test connection with a simple API call
        await serviceM8Client.listClients(1, 0);
        serviceM8Status.connected = true;
        serviceM8Status.last_sync = new Date().toISOString();
      } catch (error) {
        serviceM8Status.error = (error as Error).message;
      }
    } else {
      serviceM8Status.error = 'ServiceM8 API key not configured';
    }

    stats.servicem8_status = serviceM8Status;

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ 
      error: 'Failed to load dashboard stats',
      details: (error as Error).message 
    }, { status: 500 });
  }
}

function formatActivityDescription(event: string, metadata: Record<string, unknown>): string {
  switch (event) {
    case 'customer_created':
      return `New customer ${metadata?.name || 'Unknown'} created`;
    case 'customer_banned':
      return `Customer ${metadata?.customer_name || 'Unknown'} was banned`;
    case 'customer_unbanned':
      return `Customer ${metadata?.customer_name || 'Unknown'} was unbanned`;
    case 'quote_approved':
      return `Quote for job ${metadata?.job_no || 'Unknown'} was approved`;
    case 'quote_rejected':
      return `Quote for job ${metadata?.job_no || 'Unknown'} was rejected`;
    case 'customer_feedback_submitted':
      return `Feedback submitted for job ${metadata?.job_no || 'Unknown'}`;
    case 'user_login':
      return `User ${metadata?.email || 'Unknown'} logged in`;
    case 'password_reset':
      return `Password reset for ${metadata?.email || 'Unknown'}`;
    default:
      return `${event.replace(/_/g, ' ')} occurred`;
  }
}
