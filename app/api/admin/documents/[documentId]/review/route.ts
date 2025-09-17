import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PUT(
  request: Request,
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
    const body = await request.json();
    const { action, notes } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: "Valid action is required (approve, reject)" 
      }, { status: 400 });
    }

    // Verify document acknowledgment exists
    const { data: acknowledgment, error: acknowledgmentError } = await supabase
      .from('document_acknowledgments')
      .select('id, document_id')
      .eq('document_id', documentId)
      .single();

    if (acknowledgmentError || !acknowledgment) {
      return NextResponse.json({ 
        error: "Document acknowledgment not found" 
      }, { status: 404 });
    }

    // Update acknowledgment with admin review
    const { error: updateError } = await supabase
      .from('document_acknowledgments')
      .update({ 
        admin_reviewed: true,
        admin_review_action: action,
        admin_review_notes: notes,
        admin_reviewed_by: user.id,
        admin_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', acknowledgment.id);

    if (updateError) throw updateError;

    // Log the review action
    const { error: logError } = await supabase
      .from('document_review_history')
      .insert({
        document_id: documentId,
        acknowledgment_id: acknowledgment.id,
        action,
        notes,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      });

    if (logError) {
      console.warn('Failed to log document review:', logError);
      // Don't fail the whole operation for logging errors
    }

    return NextResponse.json({ 
      message: `Document ${action}d successfully`,
      action,
      notes
    });
  } catch (error) {
    console.error('Document review error:', error);
    return NextResponse.json({ 
      error: 'Failed to review document' 
    }, { status: 500 });
  }
}
