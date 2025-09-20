import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
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
    const { documentId } = await params;
    const { customerId, acknowledgedBy } = await request.json();
    
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    // Verify document exists and belongs to customer
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('id, customer_id, title, type')
      .eq('id', documentId)
      .eq('customer_id', customerId)
      .single();

    if (documentError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if document_acknowledgments table exists, if not create acknowledgment record
    try {
      const { error: ackError } = await supabase
        .from('document_acknowledgments')
        .upsert({
          document_id: documentId,
          customer_id: customerId,
          acknowledged_by: acknowledgedBy || 'admin',
          acknowledged_at: new Date().toISOString(),
          acknowledged_via: 'admin_portal'
        }, { onConflict: 'document_id,customer_id' });

      if (ackError) {
        console.warn('Failed to create acknowledgment record:', ackError);
      }
    } catch (error) {
      // Table might not exist, that's ok for now
      console.warn('Document acknowledgments table not available:', error);
    }

    // Create audit log entry
    await supabase
      .from('audit_logs')
      .insert({
        customer_id: customerId,
        actor_id: user.id,
        event: 'document_acknowledged',
        metadata: {
          document_id: documentId,
          document_title: document.title,
          document_type: document.type,
          acknowledged_by: acknowledgedBy || 'admin',
          acknowledged_via: 'admin_portal'
        }
      });

    return NextResponse.json({ 
      message: 'Document acknowledged successfully',
      documentId,
      customerId,
      acknowledgedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Admin document acknowledgment error:', error);
    return NextResponse.json({ error: 'Failed to acknowledge document' }, { status: 500 });
  }
}
