import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ServiceM8Client } from "@/lib/servicem8";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  const supabase: SupabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { attachmentId } = await params;
    const body = await request.json() as { signature?: string; notes?: string };
    const { signature, notes } = body;

    // Get user profile to check role and get customer info
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, customer_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Get attachment details to verify customer access
    const { data: attachment } = await supabase
      .from('job_attachments')
      .select(`
        id, 
        job_id, 
        servicem8_attachment_uuid,
        jobs!inner(
          id,
          customer_id
        )
      `)
      .eq('id', attachmentId)
      .single();

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Verify customer can access this attachment
    const jobForAttachment = Array.isArray(attachment.jobs) ? attachment.jobs[0] : (attachment.jobs as { id: string; customer_id: string } | undefined);
    if (profile.role === 'customer' && jobForAttachment?.customer_id !== profile.customer_id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Store acknowledgment in Supabase first
    const { data: acknowledgment, error: acknowledgmentError } = await supabase
      .from('document_acknowledgments')
      .insert({
        document_id: attachmentId,
        customer_id: (Array.isArray(attachment.jobs) ? attachment.jobs[0]?.customer_id : (attachment.jobs as { customer_id: string } | undefined)?.customer_id) as string,
        signature: signature || null,
        notes: notes || null,
        acknowledged_by: user.id,
        acknowledged_at: new Date().toISOString()
      })
      .select()
      .single();

    if (acknowledgmentError) throw acknowledgmentError;

    // If we have a ServiceM8 attachment UUID, also send to ServiceM8
    if (attachment.servicem8_attachment_uuid && process.env.SERVICEM8_API_KEY) {
      try {
        const servicem8Client = new ServiceM8Client(process.env.SERVICEM8_API_KEY);
        
        await servicem8Client.acknowledgeDocument(attachment.servicem8_attachment_uuid, {
          acknowledged: true,
          acknowledgment_date: new Date().toISOString(),
          customer_signature: signature,
          notes: notes
        });

        // Update the acknowledgment record to mark it as synced
        await supabase
          .from('document_acknowledgments')
          .update({ 
            servicem8_synced: true,
            servicem8_synced_at: new Date().toISOString()
          })
          .eq('id', acknowledgment.id);

      } catch (servicem8Error) {
        console.error('ServiceM8 sync error:', servicem8Error);
        
        // Log the sync failure but don't fail the request
        await supabase
          .from('document_acknowledgments')
          .update({ 
            servicem8_sync_error: (servicem8Error as Error).message,
            servicem8_sync_attempted_at: new Date().toISOString()
          })
          .eq('id', acknowledgment.id);
      }
    }

    return NextResponse.json({ 
      message: "Document acknowledged successfully",
      acknowledgment
    });
  } catch (error) {
    console.error('Document acknowledgment error:', error);
    return NextResponse.json({ 
      error: 'Failed to acknowledge document' 
    }, { status: 500 });
  }
}
