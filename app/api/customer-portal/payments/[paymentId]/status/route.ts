import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { customerPortalAPI } from "@/lib/customer-portal-api";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { paymentId } = await params;
    const body = await request.json();
    const { status, notes, updatedBy } = body;

    if (!status) {
      return NextResponse.json({ 
        error: "Status is required" 
      }, { status: 400 });
    }

    // For now, use a mock company UUID - in production, this would come from the session
    const companyUuid = "company-123";
    
    const success = await customerPortalAPI.updatePaymentStatus(
      paymentId,
      status,
      companyUuid,
      {
        notes,
        updatedBy: updatedBy || 'customer'
      }
    );

    if (success) {
      return NextResponse.json({ 
        message: "Payment status updated successfully" 
      });
    } else {
      return NextResponse.json({ 
        error: "Failed to update payment status" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Payment status update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update payment status' 
    }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { paymentId } = await params;

    // For now, use a mock company UUID - in production, this would come from the session
    const companyUuid = "company-123";
    
    const statusHistory = await customerPortalAPI.getPaymentStatusHistory(paymentId, companyUuid);

    return NextResponse.json({ 
      statusHistory 
    });
  } catch (error) {
    console.error('Get payment status history error:', error);
    return NextResponse.json({ 
      error: 'Failed to get payment status history' 
    }, { status: 500 });
  }
}
