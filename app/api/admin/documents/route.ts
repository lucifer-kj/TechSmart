import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SyncService } from "@/lib/sync-service";

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const documentType = searchParams.get('documentType');
    const customer = searchParams.get('customer');
    const customerId = searchParams.get('customerId');
    const jobId = searchParams.get('jobId');
    const refresh = searchParams.get('refresh') === 'true';

    if (refresh && (customerId || jobId)) {
      try {
        const apiKey = process.env.SERVICEM8_API_KEY;
        if (apiKey) {
          const sync = new SyncService(apiKey);
          if (customerId) {
            const { data: customerRow } = await supabase
              .from('customers')
              .select('servicem8_customer_uuid')
              .eq('id', customerId)
              .single();
            if (customerRow?.servicem8_customer_uuid) {
              await sync.syncCustomerData(customerRow.servicem8_customer_uuid);
            }
          }
        }
      } catch (e) {
        console.warn('Admin documents refresh failed:', e);
      }
    }

    // Build query for document acknowledgments with related data
    let query = supabase
      .from('document_acknowledgments')
      .select(`
        id,
        document_id,
        signature,
        notes,
        acknowledged_by,
        acknowledged_at,
        created_at,
        customers!inner(
          id,
          name
        ),
        jobs!inner(
          id,
          job_no,
          description
        )
      `);

    // Apply filters
    if (status) {
      // For now, we'll filter in memory since we need to determine status from the data
      // In a production app, you might want to add a status field to the table
    }

    if (customer) {
      query = query.or(`customers.name.ilike.%${customer}%`);
    }

    if (customerId) {
      query = query.eq('customers.id', customerId);
    }
    if (jobId) {
      query = query.eq('jobs.id', jobId);
    }

    const { data: acknowledgments, error: acknowledgmentsError } = await query;

    if (acknowledgmentsError) throw acknowledgmentsError;

    // Transform the data to match our DocumentApproval interface
    type AckRow = {
      id: string;
      document_id: string;
      signature: string | null;
      notes: string | null;
      acknowledged_by: string | null;
      acknowledged_at: string | null;
      created_at: string | null;
      jobs: { id: string; job_no: string; description: string }[];
      customers: { id: string; name: string }[];
    };

    const transformedDocuments = (acknowledgments as AckRow[] | null)?.map(ack => {
      const job = Array.isArray(ack.jobs) ? ack.jobs[0] : undefined;
      const customer = Array.isArray(ack.customers) ? ack.customers[0] : undefined;
      return {
        id: ack.id,
        document_id: ack.document_id,
        document_name: `Document ${ack.document_id}`,
        document_type: 'contract' as const,
        job_id: job?.id ?? '',
        job_number: job?.job_no ?? '',
        customer_id: customer?.id ?? '',
        customer_name: customer?.name ?? 'Unknown',
        status: 'approved' as const,
        submitted_at: ack.acknowledged_at ?? ack.created_at ?? '',
        reviewed_at: ack.acknowledged_at ?? undefined,
        reviewed_by: ack.acknowledged_by ?? undefined,
        review_notes: ack.notes ?? undefined
      };
    }) || [];

    // Apply additional filters
    let filteredDocuments = transformedDocuments;
    
    if (status) {
      filteredDocuments = filteredDocuments.filter(doc => doc.status === status);
    }
    
    if (documentType) {
      filteredDocuments = filteredDocuments.filter(doc => 
        doc.document_type.toLowerCase() === documentType.toLowerCase()
      );
    }

    return NextResponse.json({ documents: filteredDocuments });
  } catch (error) {
    console.error('Admin documents error:', error);
    return NextResponse.json({ error: 'Failed to load documents' }, { status: 500 });
  }
}
