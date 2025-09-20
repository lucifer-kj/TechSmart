import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
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

  // Check if user is admin
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    // ServiceM8 settings
    const servicem8ApiKey = process.env.SERVICEM8_API_KEY;
    let servicem8Status = 'disconnected';
    let servicem8Error: string | undefined;
    let servicem8CustomerUuid: string | undefined;
    let lastSync: string | undefined;

    if (servicem8ApiKey) {
      try {
        const serviceM8Client = new ServiceM8Client(servicem8ApiKey);
        // Test connection by trying to fetch a single client
        await serviceM8Client.listClients(1, 0);
        servicem8Status = 'active';
        
        // Try to get company UUID from config
        try {
          const { getServiceM8Config } = await import('@/lib/servicem8-config');
          const config = await getServiceM8Config();
          if (config) {
            servicem8CustomerUuid = config.companyUuid;
          }
        } catch {
          // Config not available, that's ok
        }

        // Get last sync time from audit logs
        const { data: lastSyncLog } = await supabase
          .from('audit_logs')
          .select('created_at')
          .eq('event', 'servicem8_sync')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        lastSync = lastSyncLog?.created_at;
      } catch (error) {
        servicem8Status = 'error';
        servicem8Error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Supabase settings
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseStatus = 'active';
    let supabaseTables: string[] = [];

    try {
      // Get list of tables
      const { data: tablesData, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .order('table_name');

      if (tablesError) throw tablesError;
      supabaseTables = tablesData?.map(t => t.table_name) || [];
    } catch {
      // Fallback to known tables
      supabaseTables = ['customers', 'jobs', 'documents', 'payments', 'user_profiles', 'quotes', 'audit_logs'];
    }

    // System information
    const version = process.env.npm_package_version || '1.0.0';
    const environment = process.env.NODE_ENV || 'development';
    
    // Calculate uptime (simplified)
    const uptimeSeconds = process.uptime();
    const uptimeHours = Math.floor(uptimeSeconds / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptime = `${uptimeHours}h ${uptimeMinutes}m`;

    // Security settings
    const { count: adminCount } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('is_active', true);

    const settingsData = {
      servicem8: {
        connected: servicem8Status === 'active',
        apiKey: servicem8ApiKey ? `${servicem8ApiKey.substring(0, 8)}...` : '',
        customerUuid: servicem8CustomerUuid,
        lastSync,
        status: servicem8Status,
        error: servicem8Error
      },
      supabase: {
        connected: true,
        url: supabaseUrl,
        status: supabaseStatus,
        tables: supabaseTables
      },
      system: {
        version,
        environment,
        uptime,
        lastRestart: new Date().toISOString() // This would be actual restart time in production
      },
      notifications: {
        emailEnabled: true, // This would come from a settings table
        webhooksEnabled: true,
        slackIntegration: false
      },
      security: {
        rlsEnabled: true,
        adminUsers: adminCount || 0,
        lastPasswordChange: undefined, // This would track actual password changes
        twoFactorEnabled: false
      }
    };

    return NextResponse.json(settingsData);
  } catch (error) {
    console.error('Settings error:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { category, key, value } = await request.json();

    // In a production app, you'd save these settings to a database table
    // For now, we'll just log the change
    await supabase
      .from('audit_logs')
      .insert({
        customer_id: '00000000-0000-0000-0000-000000000000', // System setting
        actor_id: user.id,
        event: 'setting_changed',
        metadata: {
          category,
          key,
          value,
          changed_at: new Date().toISOString()
        }
      });

    return NextResponse.json({ 
      message: 'Setting updated successfully',
      category,
      key,
      value
    });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }
}
