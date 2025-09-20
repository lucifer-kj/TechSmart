#!/usr/bin/env tsx
/**
 * Client API Flow Test Script
 * 
 * This script tests the complete client API data fetching flow:
 * 1. Tests authentication
 * 2. Tests user profile lookup  
 * 3. Tests customer mapping
 * 4. Tests jobs and dashboard APIs
 * 
 * Run with: npx tsx scripts/test-client-api.ts
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabaseSetup() {
  console.log('🔍 Testing database setup...');
  
  // Test user_profiles table
  try {
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ user_profiles table error:', error.message);
      return false;
    }
    
    console.log('✅ user_profiles table accessible');
  } catch (error) {
    console.error('❌ user_profiles table test failed:', error);
    return false;
  }
  
  // Test customers table
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ customers table error:', error.message);
      return false;
    }
    
    console.log('✅ customers table accessible');
  } catch (error) {
    console.error('❌ customers table test failed:', error);
    return false;
  }
  
  return true;
}

async function testUserProfileMapping() {
  console.log('🔍 Testing user-customer mapping...');
  
  // Get a sample user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select(`
      *,
      customers (
        id,
        name,
        servicem8_customer_uuid
      )
    `)
    .eq('role', 'customer')
    .limit(1)
    .single();
  
  if (!profile) {
    console.log('⚠️ No customer user profiles found');
    return false;
  }
  
  if (!profile.customer_id) {
    console.log('⚠️ User profile missing customer_id');
    return false;
  }
  
  if (!profile.customers) {
    console.log('⚠️ Customer mapping not found');
    return false;
  }
  
  console.log('✅ User-customer mapping working');
  console.log(`   User: ${profile.email}`);
  console.log(`   Customer: ${profile.customers.name}`);
  console.log(`   ServiceM8 UUID: ${profile.customers.servicem8_customer_uuid}`);
  
  return true;
}

async function testApiEndpoints() {
  console.log('🔍 Testing API endpoints...');
  
  try {
    // Test jobs endpoint
    const jobsResponse = await fetch(`${baseUrl}/api/customer-portal/jobs`);
    const jobsData = await jobsResponse.json();
    
    if (jobsResponse.ok) {
      console.log('✅ Jobs API working');
      console.log(`   Found ${jobsData.jobs?.length || 0} jobs`);
    } else {
      console.log('⚠️ Jobs API returned error:', jobsData.error);
      // This might be expected if no auth, but should fallback to mock data in dev
    }
    
    // Test dashboard endpoint
    const dashboardResponse = await fetch(`${baseUrl}/api/customer-portal/dashboard`);
    const dashboardData = await dashboardResponse.json();
    
    if (dashboardResponse.ok) {
      console.log('✅ Dashboard API working');
      console.log(`   Total jobs: ${dashboardData.totalJobs || 0}`);
      console.log(`   Active jobs: ${dashboardData.activeJobs || 0}`);
    } else {
      console.log('⚠️ Dashboard API returned error:', dashboardData.error);
    }
    
    return jobsResponse.ok && dashboardResponse.ok;
  } catch (error) {
    console.error('❌ API endpoint test failed:', error);
    return false;
  }
}

async function testServiceM8MockData() {
  console.log('🔍 Testing ServiceM8 mock data...');
  
  try {
    const { getJobsForCustomer } = await import('../lib/servicem8');
    const mockJobs = await getJobsForCustomer('company-123');
    
    if (mockJobs && mockJobs.length > 0) {
      console.log('✅ ServiceM8 mock data working');
      console.log(`   Generated ${mockJobs.length} mock jobs`);
      console.log(`   Sample job: ${mockJobs[0].job_number} - ${mockJobs[0].job_description}`);
      return true;
    } else {
      console.log('❌ No mock data generated');
      return false;
    }
  } catch (error) {
    console.error('❌ ServiceM8 mock data test failed:', error);
    return false;
  }
}

async function testAuthFlow() {
  console.log('🔍 Testing auth flow...');
  
  try {
    // Import the auth function
    const { getAuthUser } = await import('../lib/auth');
    
    // This will return null in this context (no request context)
    // but should not throw an error
    const user = await getAuthUser();
    console.log('✅ getAuthUser function working (returns null in script context, as expected)');
    
    return true;
  } catch (error) {
    console.error('❌ Auth flow test failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Client API Flow Test...\n');
  
  const tests = [
    { name: 'Database Setup', test: testDatabaseSetup },
    { name: 'Auth Flow', test: testAuthFlow },
    { name: 'ServiceM8 Mock Data', test: testServiceM8MockData },
    { name: 'User-Customer Mapping', test: testUserProfileMapping },
    { name: 'API Endpoints', test: testApiEndpoints },
  ];
  
  const results = [];
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      results.push({ name, success: result });
      console.log(''); // Add spacing between tests
    } catch (error) {
      console.error(`❌ ${name} test crashed:`, error);
      results.push({ name, success: false });
      console.log('');
    }
  }
  
  // Summary
  console.log('📋 Test Results Summary:');
  console.log('========================');
  
  let allPassed = true;
  for (const { name, success } of results) {
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${name}`);
    if (!success) allPassed = false;
  }
  
  console.log('');
  
  if (allPassed) {
    console.log('🎉 All tests passed! Client API flow should be working.');
  } else {
    console.log('⚠️ Some tests failed. Check the issues above.');
    console.log('💡 Try running: npm run fix-dev-setup');
  }
  
  console.log('\n📝 Next steps:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Visit http://localhost:3000/login');
  console.log('3. Sign in and test the dashboard');
  console.log('4. Check browser console for any remaining errors');
}

// Run the test
main().catch(console.error);
