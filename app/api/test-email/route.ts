import { NextRequest, NextResponse } from 'next/server';
import { getEmailService } from '@/lib/email-service';
import { z } from 'zod';

const testEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  template: z.enum([
    'welcome',
    'password-reset',
    'quote-approval',
    'job-update',
    'payment-reminder',
    'document-notification',
    'invitation',
    'account-deactivated',
    'password-changed'
  ]).optional(),
  subject: z.string().optional(),
  html: z.string().optional(),
});

// POST - Send test email (for development/testing)
export async function POST(request: NextRequest) {
  void request;
  return NextResponse.json({ message: 'Test email not implemented (pre-Phase 2 state)' }, { status: 501 });
}

// Get sample template data for testing
function getSampleTemplateData(template: string): Record<string, unknown> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  switch (template) {
    case 'welcome':
      return {
        userName: 'John Doe',
        companyName: 'SmartTech Solutions',
        loginUrl: `${baseUrl}/login`,
        supportEmail: 'support@smarttech.com',
      };
    
    case 'password-reset':
      return {
        userName: 'John Doe',
        resetUrl: `${baseUrl}/auth/reset-password?token=sample-token`,
        expiresIn: '24 hours',
        supportEmail: 'support@smarttech.com',
      };
    
    case 'quote-approval':
      return {
        userName: 'John Doe',
        quoteNumber: 'QT-2024-001',
        amount: '$1,250.00',
        approvalUrl: `${baseUrl}/quotes/approve?token=sample-token`,
        expiresAt: 'December 31, 2024',
        supportEmail: 'support@smarttech.com',
      };
    
    case 'job-update':
      return {
        userName: 'John Doe',
        jobNumber: 'JOB-2024-001',
        jobTitle: 'HVAC System Maintenance',
        status: 'In Progress',
        statusDescription: 'Technician is currently working on the system',
        jobUrl: `${baseUrl}/jobs/JOB-2024-001`,
        supportEmail: 'support@smarttech.com',
      };
    
    case 'payment-reminder':
      return {
        userName: 'John Doe',
        invoiceNumber: 'INV-2024-001',
        amount: '$1,250.00',
        dueDate: 'January 15, 2024',
        paymentUrl: `${baseUrl}/payments/INV-2024-001`,
        supportEmail: 'support@smarttech.com',
      };
    
    case 'document-notification':
      return {
        userName: 'John Doe',
        documentName: 'Service Report - HVAC Maintenance',
        documentType: 'Service Report',
        documentUrl: `${baseUrl}/documents/sample-document`,
        supportEmail: 'support@smarttech.com',
      };
    
    case 'invitation':
      return {
        userName: 'John Doe',
        companyName: 'SmartTech Solutions',
        invitationUrl: `${baseUrl}/auth/invite/sample-token`,
        expiresAt: 'January 15, 2024',
        supportEmail: 'support@smarttech.com',
      };
    
    case 'account-deactivated':
      return {
        userName: 'John Doe',
      };
    
    case 'password-changed':
      return {
        userName: 'John Doe',
      };
    
    default:
      return {
        userName: 'John Doe',
        companyName: 'SmartTech Solutions',
        supportEmail: 'support@smarttech.com',
      };
  }
}
