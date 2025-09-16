import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
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
    const body = await request.json();
    const { action, customerIds } = body;

    if (!action || !customerIds || !Array.isArray(customerIds)) {
      return NextResponse.json({ 
        error: "Action and customer IDs are required" 
      }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'ban':
        // Update customer status to banned and deactivate user accounts
        result = await supabase
          .from('user_profiles')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .in('customer_id', customerIds);
        
        if (result.error) throw result.error;
        break;

      case 'activate':
        // Activate user accounts
        result = await supabase
          .from('user_profiles')
          .update({ 
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .in('customer_id', customerIds);
        
        if (result.error) throw result.error;
        break;

      case 'export':
        // Get customer data for export
        const { data: customers, error: exportError } = await supabase
          .from('customers')
          .select(`
            id,
            servicem8_customer_uuid,
            name,
            email,
            phone,
            created_at,
            updated_at
          `)
          .in('id', customerIds);

        if (exportError) throw exportError;

        // Return CSV data
        const csvHeaders = ['ID', 'ServiceM8 UUID', 'Name', 'Email', 'Phone', 'Created At', 'Updated At'];
        const csvRows = customers?.map(customer => [
          customer.id,
          customer.servicem8_customer_uuid,
          customer.name,
          customer.email || '',
          customer.phone || '',
          new Date(customer.created_at).toISOString(),
          new Date(customer.updated_at).toISOString()
        ]) || [];

        const csvContent = [
          csvHeaders.join(','),
          ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
        ].join('\n');

        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="customers_export.csv"'
          }
        });

      default:
        return NextResponse.json({ 
          error: "Invalid action" 
        }, { status: 400 });
    }

    return NextResponse.json({ 
      message: `Successfully ${action}ed ${customerIds.length} customers` 
    });
  } catch (error) {
    console.error('Bulk action error:', error);
    return NextResponse.json({ 
      error: 'Failed to perform bulk action' 
    }, { status: 500 });
  }
}
