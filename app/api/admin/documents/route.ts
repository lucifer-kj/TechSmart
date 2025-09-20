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
    const syncWithServiceM8 = searchParams.get('sync') === 'true';

    let serviceM8Available = false;
    let serviceM8Error: string | null = null;
    
    // Check if ServiceM8 API key is available
    if (!process.env.SERVICEM8_API_KEY) {
      console.log('⚠️ ServiceM8 API key not configured - using local data only');
      serviceM8Error = 'ServiceM8 API key not configured';
    } else {
      serviceM8Available = true;
      console.log('✅ ServiceM8 API key found - attempting sync if requested');
      
      // Sync with ServiceM8 if requested
      if (syncWithServiceM8) {
        try {
          console.log('🔄 Syncing documents from ServiceM8...');
          
          // Get all customers with ServiceM8 UUIDs
          const { data: customersWithUUIDs } = await supabase
            .from('customers')
            .select('id, servicem8_customer_uuid')
            .not('servicem8_customer_uuid', 'is', null);
          
          if (customersWithUUIDs && customersWithUUIDs.length > 0) {
            console.log(`📋 Found ${customersWithUUIDs.length} customers with ServiceM8 UUIDs`);
            
            // Sync documents for each customer (limit to prevent timeout)
            const syncPromises = customersWithUUIDs.slice(0, 10).map(async (customer) => {
              try {
                const sync = new SyncService(process.env.SERVICEM8_API_KEY!);
                await sync.syncCustomerData(customer.servicem8_customer_uuid);
                console.log(`✅ Synced documents for customer ${customer.id}`);
              } catch (error) {
                console.warn(`⚠️ Failed to sync documents for customer ${customer.id}:`, error);
              }
            });
            
            await Promise.all(syncPromises);
            console.log('✅ ServiceM8 document sync completed');
          } else {
            console.log('⚠️ No customers with ServiceM8 UUIDs found');
          }
        } catch (error) {
          console.error('❌ ServiceM8 document sync error:', error);
          serviceM8Error = error instanceof Error ? error.message : 'Unknown ServiceM8 error';
          serviceM8Available = false;
          // Continue with database query even if ServiceM8 fails
        }
      }
    }

    // Build query for documents with related data
    let query = supabase
      .from('documents')
      .select(`
        id,
        servicem8_attachment_uuid,
        file_name,
        file_type,
        file_size,
        attachment_source,
        type,
        title,
        url,
        date_created_sm8,
        created_at,
        customer_id,
        job_id,
        customers!inner(
          id,
          name,
          email
        ),
        jobs!inner(
          id,
          job_no,
          description,
          status
        )
      `);

    // Apply filters
    if (documentType) {
      query = query.eq('type', documentType);
    }

    if (customer) {
      query = query.or(`customers.name.ilike.%${customer}%,customers.email.ilike.%${customer}%`);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }
    
    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data: documents, error: documentsError } = await query;

    if (documentsError) throw documentsError;

    // Transform the data to provide comprehensive document information
    type DocumentRow = {
      id: string;
      servicem8_attachment_uuid: string;
      file_name: string;
      file_type: string;
      file_size: number;
      attachment_source: string;
      type: string;
      title: string;
      url: string;
      date_created_sm8: string;
      created_at: string;
      customer_id: string;
      job_id: string;
      jobs: { id: string; job_no: string; description: string; status: string }[];
      customers: { id: string; name: string; email: string }[];
    };

    const transformedDocuments = (documents as DocumentRow[] | null)?.map(doc => {
      const job = Array.isArray(doc.jobs) ? doc.jobs[0] : undefined;
      const customer = Array.isArray(doc.customers) ? doc.customers[0] : undefined;
      return {
        id: doc.id,
        uuid: doc.servicem8_attachment_uuid,
        file_name: doc.file_name || doc.title,
        file_type: doc.file_type,
        file_size: doc.file_size,
        attachment_source: doc.attachment_source,
        type: doc.type,
        url: doc.url,
        date_created: doc.date_created_sm8 || doc.created_at,
        customer_id: doc.customer_id,
        customer_name: customer?.name ?? 'Unknown',
        customer_email: customer?.email ?? '',
        job_id: doc.job_id,
        job_number: job?.job_no ?? '',
        job_description: job?.description ?? '',
        job_status: job?.status ?? '',
        download_url: doc.url || `/api/servicem8/attachments/${doc.servicem8_attachment_uuid}`,
        preview_url: getPreviewUrl(doc.file_type)
      };
    }) || [];

    // Apply additional filters
    let filteredDocuments = transformedDocuments;
    
    if (status) {
      filteredDocuments = filteredDocuments.filter(doc => doc.job_status === status);
    }

    const response = {
      documents: filteredDocuments,
      total: filteredDocuments.length,
      servicem8_status: {
        available: serviceM8Available,
        error: serviceM8Error,
        synced: syncWithServiceM8 && serviceM8Available
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Admin documents error:', error);
    return NextResponse.json({ error: 'Failed to load documents' }, { status: 500 });
  }
}

function getPreviewUrl(fileType: string): string | undefined {
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const extension = fileType.toLowerCase().split('.').pop();
  
  if (extension && imageTypes.includes(extension)) {
    return `/api/servicem8/attachments/preview/${fileType}`;
  }
  
  return undefined;
}
