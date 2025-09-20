import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ServiceM8Client } from "@/lib/servicem8";

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customer = searchParams.get('customer');
    const dateRange = searchParams.get('dateRange');
    const fileType = searchParams.get('fileType');
    const sortBy = searchParams.get('sortBy') || 'date';
    const syncWithServiceM8 = searchParams.get('sync') === 'true';

    console.log('📋 Admin quotes API called with params:', { status, customer, dateRange, fileType, sortBy, syncWithServiceM8 });

    let serviceM8Available = false;
    let serviceM8Error: string | null = null;

    // Check ServiceM8 API availability and sync if requested
    if (!process.env.SERVICEM8_API_KEY) {
      console.log('⚠️ ServiceM8 API key not configured');
      serviceM8Available = false;
      serviceM8Error = 'ServiceM8 API key not configured';
    } else {
      serviceM8Available = true;
      console.log('✅ ServiceM8 API key found - attempting sync if requested');
      
      // Sync with ServiceM8 if requested
      if (syncWithServiceM8) {
        try {
          console.log('🔄 Syncing quotes from ServiceM8 attachments...');
          
          const serviceM8Client = new ServiceM8Client(process.env.SERVICEM8_API_KEY!);
          
          // Get all attachments from ServiceM8
          const attachments = await serviceM8Client.getAllAttachments();
          console.log(`📋 Retrieved ${attachments.length} attachments from ServiceM8`);
          
          if (attachments.length > 0) {
            // Get jobs to map job UUIDs to customer IDs
            const jobUuids = [...new Set(attachments.map(a => a.related_object_uuid).filter(Boolean))];
            const { data: jobs } = await supabase
              .from('jobs')
              .select('id, customer_id, servicem8_job_uuid')
              .in('servicem8_job_uuid', jobUuids);
            
            const jobMap = new Map(jobs?.map(job => [job.servicem8_job_uuid, job]) || []);
            
            // Transform attachments to document format for quotes
            const quotesToUpsert = attachments.map(attachment => {
              const job = jobMap.get(attachment.related_object_uuid);
              
              return {
                servicem8_attachment_uuid: attachment.uuid,
                file_name: attachment.attachment_name || 'Unnamed Attachment',
                file_type: attachment.file_type || 'unknown',
                file_size: 0, // ServiceM8 attachments don't include file size
                attachment_source: 'ServiceM8 Attachment',
                type: 'quote', // Mark as quote type
                title: attachment.attachment_name || 'Unnamed Attachment',
                url: null, // ServiceM8 attachments require separate API call to get URL
                date_created_sm8: attachment.edit_date,
                created_at: new Date().toISOString(),
                customer_id: job?.customer_id,
                job_id: job?.id,
                // Store additional attachment data as metadata
                metadata: {
                  photo_width: attachment.photo_width,
                  photo_height: attachment.photo_height,
                  attachment_source: attachment.attachment_source,
                  tags: attachment.tags,
                  extracted_info: attachment.extracted_info,
                  is_favourite: attachment.is_favourite,
                  created_by_staff_uuid: attachment.created_by_staff_uuid,
                  timestamp: attachment.timestamp,
                  lng: attachment.lng,
                  lat: attachment.lat,
                  related_object: attachment.related_object,
                  active: attachment.active
                }
              };
            }).filter(quote => quote.customer_id && quote.job_id); // Only include attachments with valid job mappings
            
            console.log(`📋 Preparing to sync ${quotesToUpsert.length} attachments as quotes`);
            
            // Upsert quotes to database
            if (quotesToUpsert.length > 0) {
              const { error: upsertError } = await supabase
                .from('documents')
                .upsert(quotesToUpsert, {
                  onConflict: 'servicem8_attachment_uuid'
                });
              
              if (upsertError) {
                console.error('❌ Error upserting quotes:', upsertError);
                throw upsertError;
              }
              
              console.log(`✅ Successfully synced ${quotesToUpsert.length} attachments as quotes`);
            }
          } else {
            console.log('⚠️ No attachments found in ServiceM8');
          }
        } catch (error) {
          console.error('❌ ServiceM8 attachments sync error:', error);
          serviceM8Error = error instanceof Error ? error.message : 'Unknown ServiceM8 error';
          serviceM8Available = false;
          // Continue with database query even if ServiceM8 fails
        }
      }
    }

    // Build query for quotes with related data
    let query = supabase
      .from('documents')
      .select(`
        id,
        uuid,
        file_name,
        file_type,
        file_size,
        attachment_source,
        type,
        url,
        date_created_sm8,
        created_at,
        metadata,
        servicem8_attachment_uuid,
        customers!inner(id, name, email),
        jobs!inner(id, job_no, description, status, servicem8_job_uuid)
      `)
      .eq('type', 'quote') // Only get quote-type documents
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      // Filter by active status from metadata
      query = query.contains('metadata', { active: parseInt(status) });
    }

    if (fileType) {
      query = query.ilike('file_type', `%${fileType}%`);
    }

    if (customer) {
      query = query.or(`customers.name.ilike.%${customer}%,customers.email.ilike.%${customer}%`);
    }

    const { data: quotes, error: quotesError } = await query;

    if (quotesError) {
      console.error('❌ Error fetching quotes:', quotesError);
      throw quotesError;
    }

    console.log(`✅ Retrieved ${quotes?.length || 0} quotes from database`);

    // Transform the data for the frontend
    const transformedQuotes = quotes?.map(quote => {
      const customer = Array.isArray(quote.customers) ? quote.customers[0] : quote.customers;
      const job = Array.isArray(quote.jobs) ? quote.jobs[0] : quote.jobs;
      const metadata = quote.metadata || {};

      return {
        id: quote.id,
        uuid: quote.uuid,
        attachment_name: quote.file_name,
        file_type: quote.file_type,
        photo_width: metadata.photo_width,
        photo_height: metadata.photo_height,
        attachment_source: quote.attachment_source,
        tags: metadata.tags || '',
        extracted_info: metadata.extracted_info || '',
        is_favourite: metadata.is_favourite || '0',
        created_by_staff_uuid: metadata.created_by_staff_uuid,
        timestamp: metadata.timestamp || quote.created_at,
        edit_date: quote.date_created_sm8 || quote.created_at,
        related_object: metadata.related_object || 'job',
        related_object_uuid: job?.servicem8_job_uuid,
        active: metadata.active || 1,
        
        // Related job and customer info
        job_id: job?.id,
        job_number: job?.job_no,
        job_description: job?.description,
        job_status: job?.status,
        customer_id: customer?.id,
        customer_name: customer?.name,
        customer_email: customer?.email,
        
        // ServiceM8 data
        servicem8_data: {
          uuid: quote.servicem8_attachment_uuid,
          metadata: metadata
        }
      };
    }) || [];

    return NextResponse.json({
      quotes: transformedQuotes,
      total: transformedQuotes.length,
      servicem8_status: {
        available: serviceM8Available,
        synced: syncWithServiceM8 && serviceM8Available && !serviceM8Error,
        error: serviceM8Error
      }
    });

  } catch (error) {
    console.error('❌ Admin quotes API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
