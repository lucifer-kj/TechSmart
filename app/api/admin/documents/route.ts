import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ServiceM8Client } from "@/lib/servicem8";

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const documentType = searchParams.get('documentType');
    const customer = searchParams.get('customer');
    const customerId = searchParams.get('customerId');
    const jobId = searchParams.get('jobId');
    const syncWithServiceM8 = searchParams.get('sync') === 'true';

    // In development mode with bypass, return mock data
    if (process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_AUTH === 'true') {
      const mockDocuments = [
        {
          id: 'doc-1',
          uuid: 'attachment-123',
          file_name: 'Quote_ST1001.pdf',
          file_type: 'pdf',
          file_size: 245760,
          attachment_source: 'ServiceM8 Attachment',
          type: 'quote',
          url: '/api/servicem8/attachments/attachment-123',
          date_created: '2024-09-15T10:30:00Z',
          customer_id: 'customer-1',
          customer_name: 'John Smith',
          customer_email: 'john.smith@example.com',
          job_id: 'job-123',
          job_number: 'ST-1001',
          job_description: 'Air conditioning maintenance and repair',
          job_status: 'Quote',
          download_url: '/api/servicem8/attachments/attachment-123',
          preview_url: undefined
        },
        {
          id: 'doc-2',
          uuid: 'attachment-456',
          file_name: 'Invoice_ST1002.pdf',
          file_type: 'pdf',
          file_size: 156890,
          attachment_source: 'ServiceM8 Attachment',
          type: 'invoice',
          url: '/api/servicem8/attachments/attachment-456',
          date_created: '2024-09-18T14:20:00Z',
          customer_id: 'customer-2',
          customer_name: 'Jane Doe',
          customer_email: 'jane.doe@example.com',
          job_id: 'job-456',
          job_number: 'ST-1002',
          job_description: 'Smart sensor installation and configuration',
          job_status: 'Invoice',
          download_url: '/api/servicem8/attachments/attachment-456',
          preview_url: undefined
        },
        {
          id: 'doc-3',
          uuid: 'material-789',
          file_name: 'Air Filter - Premium HEPA',
          file_type: 'material',
          file_size: 0,
          attachment_source: 'Job Material',
          type: 'material',
          url: null,
          date_created: '2024-09-16T09:45:00Z',
          customer_id: 'customer-1',
          customer_name: 'John Smith',
          customer_email: 'john.smith@example.com',
          job_id: 'job-123',
          job_number: 'ST-1001',
          job_description: 'Air conditioning maintenance and repair',
          job_status: 'Work Order',
          download_url: null,
          preview_url: undefined
        },
        {
          id: 'doc-4',
          uuid: 'attachment-789',
          file_name: 'Before_After_Photos.jpg',
          file_type: 'jpg',
          file_size: 2048000,
          attachment_source: 'ServiceM8 Attachment',
          type: 'photo',
          url: '/api/servicem8/attachments/attachment-789',
          date_created: '2024-09-17T16:15:00Z',
          customer_id: 'customer-3',
          customer_name: 'Mike Wilson',
          customer_email: 'mike.wilson@example.com',
          job_id: 'job-789',
          job_number: 'ST-1003',
          job_description: 'HVAC system upgrade and optimization',
          job_status: 'Complete',
          download_url: '/api/servicem8/attachments/attachment-789',
          preview_url: '/api/servicem8/attachments/preview/jpg'
        }
      ];

      // Apply filters to mock data
      let filteredDocuments = mockDocuments;
      
      if (documentType) {
        filteredDocuments = filteredDocuments.filter(doc => doc.type === documentType);
      }
      
      if (customer) {
        filteredDocuments = filteredDocuments.filter(doc => 
          doc.customer_name.toLowerCase().includes(customer.toLowerCase()) ||
          doc.customer_email.toLowerCase().includes(customer.toLowerCase())
        );
      }
      
      if (customerId) {
        filteredDocuments = filteredDocuments.filter(doc => doc.customer_id === customerId);
      }
      
      if (jobId) {
        filteredDocuments = filteredDocuments.filter(doc => doc.job_id === jobId);
      }
      
      if (status) {
        filteredDocuments = filteredDocuments.filter(doc => doc.job_status === status);
      }

      return NextResponse.json({
        documents: filteredDocuments,
        total: filteredDocuments.length,
        servicem8_status: {
          available: false,
          error: 'Development mode - using mock data',
          synced: false
        }
      });
    }

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
          console.log('🔄 Syncing documents from ServiceM8 attachments and job materials...');
          
          const serviceM8Client = new ServiceM8Client(process.env.SERVICEM8_API_KEY!);
          
          // Get both attachments and job materials from ServiceM8
          const [attachments, jobMaterials] = await Promise.all([
            serviceM8Client.getAllAttachments(),
            serviceM8Client.getAllJobMaterials()
          ]);
          
          console.log(`📋 Retrieved ${attachments.length} attachments and ${jobMaterials.length} job materials from ServiceM8`);
          
          // Get all unique job UUIDs
          const attachmentJobUuids = [...new Set(attachments.map(a => a.related_object_uuid).filter(Boolean))];
          const materialJobUuids = [...new Set(jobMaterials.map(m => m.job_uuid))];
          const allJobUuids = [...new Set([...attachmentJobUuids, ...materialJobUuids])];
          
          if (allJobUuids.length > 0) {
            // Get jobs to map job UUIDs to customer IDs
            const { data: jobs } = await supabase
              .from('jobs')
              .select('id, customer_id, servicem8_job_uuid')
              .in('servicem8_job_uuid', allJobUuids);
            
            const jobMap = new Map(jobs?.map(job => [job.servicem8_job_uuid, job]) || []);
            
            // Transform attachments to document format
            const attachmentDocuments = attachments
              .filter(attachment => attachment.related_object === 'job')
              .map(attachment => {
                const job = jobMap.get(attachment.related_object_uuid);
                
                return {
                  servicem8_attachment_uuid: attachment.uuid,
                  file_name: attachment.attachment_name || 'Unnamed Attachment',
                  file_type: attachment.file_type || 'unknown',
                  file_size: 0, // ServiceM8 attachments don't include file size
                  attachment_source: 'ServiceM8 Attachment',
                  type: determineDocumentType(attachment.attachment_name, attachment.file_type),
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
              }).filter(doc => doc.customer_id && doc.job_id); // Only include attachments with valid job mappings
            
            // Transform job materials to document format
            const materialDocuments = jobMaterials.map(material => {
              const job = jobMap.get(material.job_uuid);
              
              return {
                servicem8_attachment_uuid: material.uuid,
                file_name: material.name,
                file_type: 'material', // Indicate this is from job materials
                file_size: 0,
                attachment_source: 'Job Material',
                type: 'material',
                title: material.name,
                url: null, // Job materials don't have direct URLs
                date_created_sm8: material.edit_date,
                created_at: new Date().toISOString(),
                customer_id: job?.customer_id,
                job_id: job?.id,
                // Store additional material data as metadata
                metadata: {
                  quantity: material.quantity,
                  price: material.price,
                  cost: material.cost,
                  displayed_amount: material.displayed_amount,
                  material_uuid: material.material_uuid,
                  sort_order: material.sort_order
                }
              };
            }).filter(doc => doc.customer_id && doc.job_id); // Only include materials with valid job mappings
            
            const allDocuments = [...attachmentDocuments, ...materialDocuments];
            console.log(`📋 Preparing to sync ${allDocuments.length} documents (${attachmentDocuments.length} attachments + ${materialDocuments.length} materials)`);
            
            // Upsert documents to database
            if (allDocuments.length > 0) {
              const { error: upsertError } = await supabase
                .from('documents')
                .upsert(allDocuments, {
                  onConflict: 'servicem8_attachment_uuid'
                });
              
              if (upsertError) {
                console.error('❌ Error upserting documents:', upsertError);
                throw upsertError;
              }
              
              console.log(`✅ Successfully synced ${allDocuments.length} documents from ServiceM8`);
            }
          } else {
            console.log('⚠️ No attachments or job materials found in ServiceM8');
          }
        } catch (error) {
          console.error('❌ ServiceM8 documents sync error:', error);
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

function determineDocumentType(fileName?: string, fileType?: string): string {
  const name = (fileName || '').toLowerCase();
  const type = (fileType || '').toLowerCase();
  
  if (name.includes('quote') || name.includes('estimate')) return 'quote';
  if (name.includes('invoice') || name.includes('bill')) return 'invoice';
  if (name.includes('receipt') || name.includes('payment')) return 'receipt';
  if (name.includes('contract') || name.includes('agreement')) return 'contract';
  if (name.includes('photo') || name.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) return 'photo';
  if (type === 'pdf') return 'document';
  
  return 'other';
}

function getPreviewUrl(fileType: string): string | undefined {
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const extension = fileType.toLowerCase().split('.').pop();
  
  if (extension && imageTypes.includes(extension)) {
    return `/api/servicem8/attachments/preview/${fileType}`;
  }
  
  return undefined;
}
