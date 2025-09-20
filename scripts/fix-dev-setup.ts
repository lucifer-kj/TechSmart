#!/usr/bin/env tsx
/**
 * Development Setup Fix Script
 * 
 * This script fixes common development setup issues:
 * 1. Creates missing user_profiles for existing auth users
 * 2. Ensures proper customer-user mappings exist
 * 3. Seeds basic development data if missing
 * 
 * Run with: npx tsx scripts/fix-dev-setup.ts
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

async function fixUserProfiles() {
  console.log('🔍 Checking for missing user profiles...');
  
  // Get all auth users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('❌ Failed to fetch auth users:', authError);
    return;
  }

  // Get existing user profiles
  const { data: existingProfiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('id');
  
  if (profileError) {
    console.error('❌ Failed to fetch user profiles:', profileError);
    return;
  }

  const existingProfileIds = new Set(existingProfiles?.map(p => p.id) || []);
  const missingProfiles = authUsers.users.filter(user => !existingProfileIds.has(user.id));

  if (missingProfiles.length === 0) {
    console.log('✅ All auth users have profiles');
    return;
  }

  console.log(`📝 Creating ${missingProfiles.length} missing user profiles...`);
  
  for (const user of missingProfiles) {
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: 'customer', // Default role
        is_active: true
      }, {
        onConflict: 'id'
      });

    if (error) {
      console.error(`❌ Failed to create profile for ${user.email}:`, error);
    } else {
      console.log(`✅ Created profile for ${user.email}`);
    }
  }
}

async function ensureDevelopmentCustomer() {
  console.log('🔍 Checking for development customer...');
  
  const servicem8CustomerUuid = process.env.SERVICEM8_CUSTOMER_UUID || 'company-123';
  
  // Check if development customer exists
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('*')
    .eq('servicem8_customer_uuid', servicem8CustomerUuid)
    .single();

  if (existingCustomer) {
    console.log('✅ Development customer exists');
    return existingCustomer;
  }

  console.log('📝 Creating development customer...');
  
  const customerId = uuidv4();
  const { data: newCustomer, error } = await supabase
    .from('customers')
    .insert({
      id: customerId,
      servicem8_customer_uuid: servicem8CustomerUuid,
      name: 'SmartTech Solutions Pty Ltd',
      email: 'admin@smarttech.com.au',
      phone: '+61 2 9876 5432'
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to create development customer:', error);
    return null;
  }

  console.log('✅ Created development customer');
  return newCustomer;
}

async function linkUserToCustomer() {
  console.log('🔍 Checking user-customer mappings...');
  
  const developmentCustomer = await ensureDevelopmentCustomer();
  if (!developmentCustomer) return;

  // Find users without customer mapping
  const { data: unlinkedUsers } = await supabase
    .from('user_profiles')
    .select('*')
    .is('customer_id', null);

  if (!unlinkedUsers || unlinkedUsers.length === 0) {
    console.log('✅ All users are linked to customers');
    return;
  }

  console.log(`📝 Linking ${unlinkedUsers.length} users to development customer...`);
  
  for (const user of unlinkedUsers) {
    // Skip admin users
    if (user.role === 'admin') continue;
    
    const { error } = await supabase
      .from('user_profiles')
      .update({ customer_id: developmentCustomer.id })
      .eq('id', user.id);

    if (error) {
      console.error(`❌ Failed to link user ${user.email}:`, error);
    } else {
      console.log(`✅ Linked user ${user.email} to development customer`);
    }
  }
}

async function createSampleJobs(customerId: string) {
  console.log('🔍 Checking for sample jobs...');
  
  const { data: existingJobs } = await supabase
    .from('jobs')
    .select('id')
    .eq('customer_id', customerId);

  if (existingJobs && existingJobs.length > 0) {
    console.log('✅ Sample jobs already exist');
    return;
  }

  console.log('📝 Creating sample jobs...');
  
  const sampleJobs = [
    {
      id: uuidv4(),
      customer_id: customerId,
      servicem8_job_uuid: 'job-123',
      job_no: 'ST-1001',
      description: 'Air conditioning maintenance and repair',
      status: 'Work Order',
      updated: new Date().toISOString()
    },
    {
      id: uuidv4(),
      customer_id: customerId,
      servicem8_job_uuid: 'job-456',
      job_no: 'ST-1002',
      description: 'Smart sensor installation and configuration',
      status: 'Quote',
      updated: new Date().toISOString()
    }
  ];

  const { error } = await supabase
    .from('jobs')
    .insert(sampleJobs);

  if (error) {
    console.error('❌ Failed to create sample jobs:', error);
  } else {
    console.log('✅ Created sample jobs');
  }
}

async function main() {
  console.log('🚀 Starting development setup fix...\n');

  try {
    await fixUserProfiles();
    const customer = await ensureDevelopmentCustomer();
    await linkUserToCustomer();
    
    if (customer) {
      await createSampleJobs(customer.id);
    }
    
    console.log('\n✅ Development setup fix completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - User profiles created/verified');
    console.log('   - Development customer ensured');
    console.log('   - User-customer mappings fixed');
    console.log('   - Sample data created if needed');
    
  } catch (error) {
    console.error('\n❌ Setup fix failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
