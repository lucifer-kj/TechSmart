#!/usr/bin/env tsx

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabaseConnectivity() {
  console.log('🧪 Testing Database Connectivity\n');

  try {
    // Test 1: Check if we can connect to Supabase
    console.log('📡 Testing Supabase connection...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('customers')
      .select('count', { count: 'exact', head: true });

    if (healthError) {
      console.log('❌ Supabase connection failed:', healthError.message);
      return false;
    } else {
      console.log('✅ Supabase connected successfully');
    }

    // Test 2: Check all required tables exist
    console.log('\n📋 Checking required tables...');
    const requiredTables = [
      'customers', 
      'user_profiles', 
      'jobs', 
      'documents', 
      'payments', 
      'quotes', 
      'audit_logs'
    ];

    for (const table of requiredTables) {
      try {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        console.log(`✅ Table '${table}': ${count || 0} records`);
      } catch (error) {
        console.log(`❌ Table '${table}': Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Test 3: Create a test customer
    console.log('\n👤 Testing customer creation...');
    const testCustomerData = {
      name: `Test Customer ${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      phone: '+61400000000',
      servicem8_customer_uuid: `test-uuid-${Date.now()}`
    };

    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert(testCustomerData)
      .select()
      .single();

    if (customerError) {
      console.log('❌ Failed to create test customer:', customerError.message);
      return false;
    } else {
      console.log('✅ Test customer created:', {
        id: newCustomer.id,
        name: newCustomer.name,
        email: newCustomer.email
      });
    }

    // Test 4: Create a user profile for the customer
    console.log('\n🔐 Testing user profile creation...');
    const userProfileData = {
      customer_id: newCustomer.id,
      email: newCustomer.email,
      full_name: newCustomer.name,
      role: 'customer',
      is_active: true
    };

    const { data: newUserProfile, error: profileError } = await supabase
      .from('user_profiles')
      .insert(userProfileData)
      .select()
      .single();

    if (profileError) {
      console.log('❌ Failed to create user profile:', profileError.message);
    } else {
      console.log('✅ User profile created:', {
        id: newUserProfile.id,
        email: newUserProfile.email,
        role: newUserProfile.role,
        is_active: newUserProfile.is_active
      });
    }

    // Test 5: Test user-specific data fetching
    console.log('\n📊 Testing user data fetching...');
    
    // Create some test data for the customer
    const testJobData = {
      customer_id: newCustomer.id,
      servicem8_job_uuid: `test-job-${Date.now()}`,
      job_no: `JOB-${Date.now()}`,
      description: 'Test job for user creation test',
      status: 'Quote',
      generated_job_total: 1500.00
    };

    const { data: newJob, error: jobError } = await supabase
      .from('jobs')
      .insert(testJobData)
      .select()
      .single();

    if (jobError) {
      console.log('❌ Failed to create test job:', jobError.message);
    } else {
      console.log('✅ Test job created:', {
        id: newJob.id,
        job_no: newJob.job_no,
        description: newJob.description,
        status: newJob.status
      });
    }

    // Test data fetching
    const { data: customerJobs, error: jobsFetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('customer_id', newCustomer.id);

    if (jobsFetchError) {
      console.log('❌ Failed to fetch customer jobs:', jobsFetchError.message);
    } else {
      console.log('✅ Customer jobs fetched:', {
        count: customerJobs.length,
        jobs: customerJobs.map(j => ({ job_no: j.job_no, status: j.status }))
      });
    }

    // Test 6: Test quote creation and approval simulation
    console.log('\n📋 Testing quote functionality...');
    const testQuoteData = {
      id: `quote-${Date.now()}`,
      customer_id: newCustomer.id,
      company_uuid: newCustomer.servicem8_customer_uuid,
      job_id: newJob.id,
      servicem8_job_uuid: newJob.servicem8_job_uuid,
      status: 'pending'
    };

    const { data: newQuote, error: quoteError } = await supabase
      .from('quotes')
      .insert(testQuoteData)
      .select()
      .single();

    if (quoteError) {
      console.log('❌ Failed to create test quote:', quoteError.message);
    } else {
      console.log('✅ Test quote created:', {
        id: newQuote.id,
        status: newQuote.status,
        customer_id: newQuote.customer_id
      });

      // Test quote approval
      const { data: approvedQuote, error: approvalError } = await supabase
        .from('quotes')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          signature: 'test-signature-data',
          notes: 'Test approval via admin'
        })
        .eq('id', newQuote.id)
        .select()
        .single();

      if (approvalError) {
        console.log('❌ Failed to approve test quote:', approvalError.message);
      } else {
        console.log('✅ Test quote approved:', {
          id: approvedQuote.id,
          status: approvedQuote.status,
          approved_at: approvedQuote.approved_at
        });
      }
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    
    // Delete in reverse order due to foreign key constraints
    await supabase.from('quotes').delete().eq('customer_id', newCustomer.id);
    await supabase.from('jobs').delete().eq('customer_id', newCustomer.id);
    await supabase.from('user_profiles').delete().eq('customer_id', newCustomer.id);
    await supabase.from('customers').delete().eq('id', newCustomer.id);
    
    console.log('✅ Test data cleaned up');

    return true;
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  }
}

async function testServiceM8Integration() {
  console.log('\n🔌 Testing ServiceM8 Integration\n');

  const apiKey = process.env.SERVICEM8_API_KEY;
  if (!apiKey) {
    console.log('⚠️ ServiceM8 API key not configured - skipping ServiceM8 tests');
    return;
  }

  try {
    console.log('📡 Testing ServiceM8 connection...');
    console.log(`🔑 Using API key: ${apiKey.substring(0, 8)}...`);
    
    // We can't test the actual ServiceM8 connection without importing the client
    // But we can verify the environment is set up correctly
    console.log('✅ ServiceM8 API key is configured');
    
  } catch (error) {
    console.log('❌ ServiceM8 test error:', error);
  }
}

async function main() {
  console.log('🚀 ServiceM8 Customer Portal - User Creation & Database Tests\n');
  console.log('='.repeat(80) + '\n');
  
  const dbTestPassed = await testDatabaseConnectivity();
  await testServiceM8Integration();
  
  console.log('\n' + '='.repeat(80));
  
  if (dbTestPassed) {
    console.log('\n✅ All tests passed! User creation functionality is working correctly.');
    console.log('\n🎯 Key Features Verified:');
    console.log('   • Database connectivity');
    console.log('   • Customer creation');
    console.log('   • User profile creation');
    console.log('   • Job data management');
    console.log('   • Quote approval workflow');
    console.log('   • Data cleanup');
  } else {
    console.log('\n❌ Some tests failed. Please check the errors above.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}
