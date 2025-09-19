#!/usr/bin/env tsx
/**
 * Development Data Seeding Script
 * 
 * This script creates sample data for development and testing.
 * Run with: npx tsx scripts/seed-dev-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Please set these in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SeedData {
  customers: any[];
  userProfiles: any[];
  jobs: any[];
  documents: any[];
  payments: any[];
}

const generateSeedData = (): SeedData => {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const customerId = uuidv4();
  const adminId = uuidv4();
  const customerUserId = uuidv4();

  return {
    customers: [
      {
        id: customerId,
        servicem8_customer_uuid: 'company-123',
        name: 'SmartTech Solutions Pty Ltd',
        email: 'contact@smarttech.com.au',
        phone: '+61 2 1234 5678',
        created_at: oneMonthAgo.toISOString(),
        updated_at: oneMonthAgo.toISOString(),
      },
      {
        id: uuidv4(),
        servicem8_customer_uuid: 'company-456',
        name: 'TechCorp Industries',
        email: 'info@techcorp.com.au',
        phone: '+61 3 9876 5432',
        created_at: twoWeeksAgo.toISOString(),
        updated_at: twoWeeksAgo.toISOString(),
      },
    ],
    userProfiles: [
      {
        id: adminId,
        email: 'admin@smarttech.com.au',
        full_name: 'Admin User',
        role: 'admin',
        customer_id: null,
        is_active: true,
        created_at: oneMonthAgo.toISOString(),
        updated_at: oneMonthAgo.toISOString(),
      },
      {
        id: customerUserId,
        email: 'customer@smarttech.com.au',
        full_name: 'Customer User',
        role: 'customer',
        customer_id: customerId,
        is_active: true,
        created_at: oneMonthAgo.toISOString(),
        updated_at: oneMonthAgo.toISOString(),
      },
    ],
    jobs: [
      {
        id: uuidv4(),
        customer_id: customerId,
        servicem8_job_uuid: 'job-123',
        job_no: 'ST-1001',
        description: 'Air conditioning maintenance and repair',
        status: 'Work Order',
        updated: new Date(oneWeekAgo.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: oneWeekAgo.toISOString(),
        updated_at: new Date(oneWeekAgo.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: uuidv4(),
        customer_id: customerId,
        servicem8_job_uuid: 'job-456',
        job_no: 'ST-1002',
        description: 'Smart sensor installation and configuration',
        status: 'Quote',
        updated: new Date(twoWeeksAgo.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: twoWeeksAgo.toISOString(),
        updated_at: new Date(twoWeeksAgo.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: uuidv4(),
        customer_id: customerId,
        servicem8_job_uuid: 'job-789',
        job_no: 'ST-1003',
        description: 'HVAC system upgrade and optimization',
        status: 'Invoice',
        updated: new Date(oneMonthAgo.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: oneMonthAgo.toISOString(),
        updated_at: new Date(oneMonthAgo.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    documents: [
      {
        id: uuidv4(),
        customer_id: customerId,
        job_id: null,
        type: 'quote',
        title: 'Service Agreement',
        url: 'https://example.com/documents/service-agreement.pdf',
        version: 1,
        created_at: oneMonthAgo.toISOString(),
      },
      {
        id: uuidv4(),
        customer_id: customerId,
        job_id: null,
        type: 'invoice',
        title: 'Invoice #INV-001',
        url: 'https://example.com/documents/invoice-001.pdf',
        version: 1,
        created_at: oneWeekAgo.toISOString(),
      },
    ],
    payments: [
      {
        id: uuidv4(),
        customer_id: customerId,
        job_id: null,
        amount_cents: 45000, // $450.00
        currency: 'AUD',
        status: 'pending',
        paid_at: null,
        created_at: oneWeekAgo.toISOString(),
      },
      {
        id: uuidv4(),
        customer_id: customerId,
        job_id: null,
        amount_cents: 32000, // $320.00
        currency: 'AUD',
        status: 'paid',
        paid_at: new Date(oneWeekAgo.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: twoWeeksAgo.toISOString(),
      },
    ],
  };
};

const seedDatabase = async () => {
  console.log('🌱 Starting database seeding...');
  
  try {
    const seedData = generateSeedData();
    
    // Clear existing data (in development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Clearing existing development data...');
      
      await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('user_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }
    
    // Insert customers
    console.log('👥 Creating customers...');
    const { error: customersError } = await supabase
      .from('customers')
      .insert(seedData.customers);
    
    if (customersError) {
      console.error('❌ Error creating customers:', customersError);
      throw customersError;
    }
    console.log(`✅ Created ${seedData.customers.length} customers`);
    
    // Insert user profiles
    console.log('👤 Creating user profiles...');
    const { error: profilesError } = await supabase
      .from('user_profiles')
      .insert(seedData.userProfiles);
    
    if (profilesError) {
      console.error('❌ Error creating user profiles:', profilesError);
      throw profilesError;
    }
    console.log(`✅ Created ${seedData.userProfiles.length} user profiles`);
    
    // Insert jobs
    console.log('🔧 Creating jobs...');
    const { error: jobsError } = await supabase
      .from('jobs')
      .insert(seedData.jobs);
    
    if (jobsError) {
      console.error('❌ Error creating jobs:', jobsError);
      throw jobsError;
    }
    console.log(`✅ Created ${seedData.jobs.length} jobs`);
    
    // Insert documents
    console.log('📄 Creating documents...');
    const { error: documentsError } = await supabase
      .from('documents')
      .insert(seedData.documents);
    
    if (documentsError) {
      console.error('❌ Error creating documents:', documentsError);
      throw documentsError;
    }
    console.log(`✅ Created ${seedData.documents.length} documents`);
    
    // Insert payments
    console.log('💰 Creating payments...');
    const { error: paymentsError } = await supabase
      .from('payments')
      .insert(seedData.payments);
    
    if (paymentsError) {
      console.error('❌ Error creating payments:', paymentsError);
      throw paymentsError;
    }
    console.log(`✅ Created ${seedData.payments.length} payments`);
    
    console.log('');
    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('📋 Test Accounts:');
    console.log('   Admin: admin@smarttech.com.au');
    console.log('   Customer: customer@smarttech.com.au');
    console.log('');
    console.log('💡 Note: You\'ll need to create these users in Supabase Auth manually');
    console.log('   or use the magic link authentication flow.');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run the seeding
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };
