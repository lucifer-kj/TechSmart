#!/usr/bin/env tsx
/**
 * Debug Jobs Sync
 * 
 * This script debugs the complete jobs sync process to identify where the issue is
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { ServiceM8Client } from '../lib/servicem8';
import { SyncService } from '../lib/sync-service';

async function debugJobsSync(): Promise<void> {
  console.log('🔧 Debug Jobs Sync Process\n');
  console.log('=' .repeat(60));
  
  const apiKey = process.env.SERVICEM8_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!apiKey) {
    console.log('❌ SERVICEM8_API_KEY not found');
    return;
  }
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Supabase configuration missing');
    return;
  }
  
  console.log(`🔑 ServiceM8 API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`🗄️ Supabase URL: ${supabaseUrl}`);
  
  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Step 1: Check customers in database
    console.log('\n📋 1. Checking customers in database...');
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, name, email, servicem8_customer_uuid')
      .not('servicem8_customer_uuid', 'is', null);
    
    if (customersError) {
      console.log('❌ Error fetching customers:', customersError);
      return;
    }
    
    console.log(`✅ Found ${customers?.length || 0} customers with ServiceM8 UUIDs`);
    
    if (!customers || customers.length === 0) {
      console.log('⚠️ No customers with ServiceM8 UUIDs found!');
      console.log('💡 You need to create customers first or sync them from ServiceM8');
      return;
    }
    
    customers.forEach((customer, index) => {
      console.log(`   ${index + 1}. ${customer.name} (${customer.email})`);
      console.log(`      UUID: ${customer.servicem8_customer_uuid}`);
    });
    
    // Step 2: Test ServiceM8 API connection
    console.log('\n📋 2. Testing ServiceM8 API connection...');
    const serviceM8Client = new ServiceM8Client(apiKey);
    
    // Try to get jobs for the first customer
    const firstCustomer = customers[0];
    console.log(`🔍 Testing with customer: ${firstCustomer.name} (${firstCustomer.servicem8_customer_uuid})`);
    
    try {
      const jobs = await serviceM8Client.getCustomerJobs(firstCustomer.servicem8_customer_uuid);
      console.log(`✅ Retrieved ${jobs.length} jobs from ServiceM8 for this customer`);
      
      if (jobs.length > 0) {
        console.log('\n📄 Sample job data:');
        const sampleJob = jobs[0];
        console.log(`   Job #${sampleJob.job_number || sampleJob.uuid}`);
        console.log(`   Status: ${sampleJob.status}`);
        console.log(`   Description: ${sampleJob.job_description}`);
        console.log(`   Company UUID: ${sampleJob.company_uuid}`);
        console.log(`   Total: $${sampleJob.generated_job_total || 0}`);
        console.log(`   Created: ${sampleJob.date_created}`);
      }
      
      // Step 3: Test sync process
      console.log('\n📋 3. Testing sync process...');
      const syncService = new SyncService(apiKey);
      
      try {
        const syncResult = await syncService.syncCustomerData(firstCustomer.servicem8_customer_uuid);
        console.log('✅ Sync completed successfully!');
        console.log(`📊 Sync result:`, syncResult);
        
        // Step 4: Check if jobs were saved to database
        console.log('\n📋 4. Checking jobs in database...');
        const { data: dbJobs, error: jobsError } = await supabase
          .from('jobs')
          .select(`
            id,
            customer_id,
            servicem8_job_uuid,
            job_no,
            description,
            status,
            generated_job_total,
            created_at
          `)
          .eq('customer_id', firstCustomer.id);
        
        if (jobsError) {
          console.log('❌ Error fetching jobs from database:', jobsError);
        } else {
          console.log(`✅ Found ${dbJobs?.length || 0} jobs in database for this customer`);
          
          if (dbJobs && dbJobs.length > 0) {
            dbJobs.slice(0, 3).forEach((job, index) => {
              console.log(`   ${index + 1}. Job #${job.job_no} - ${job.status}`);
              console.log(`      Description: ${job.description}`);
              console.log(`      Total: $${job.generated_job_total || 0}`);
              console.log(`      ServiceM8 UUID: ${job.servicem8_job_uuid}`);
            });
          }
        }
        
        // Step 5: Check all jobs across all customers
        console.log('\n📋 5. Checking all jobs in database...');
        const { data: allJobs, error: allJobsError } = await supabase
          .from('jobs')
          .select(`
            id,
            job_no,
            status,
            description,
            customers!inner(name, email)
          `)
          .order('created_at', { ascending: false });
        
        if (allJobsError) {
          console.log('❌ Error fetching all jobs:', allJobsError);
        } else {
          console.log(`✅ Total jobs in database: ${allJobs?.length || 0}`);
          
          if (allJobs && allJobs.length > 0) {
            console.log('\n📊 Job status breakdown:');
            const statusCounts = allJobs.reduce((acc: Record<string, number>, job) => {
              const status = job.status || 'unknown';
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            }, {});
            
            Object.entries(statusCounts).forEach(([status, count]) => {
              console.log(`   ${status}: ${count} jobs`);
            });
          }
        }
        
      } catch (syncError) {
        console.log('❌ Sync failed:', syncError);
      }
      
    } catch (apiError) {
      console.log('❌ ServiceM8 API call failed:', apiError);
    }
    
    // Step 6: Test the admin jobs API
    console.log('\n📋 6. Testing admin jobs API response...');
    try {
      const response = await fetch('http://localhost:3000/api/admin/jobs?sync=true', {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Admin jobs API response:');
        console.log(`   Total jobs: ${data.jobs?.length || 0}`);
        console.log(`   ServiceM8 available: ${data.servicem8_status?.available}`);
        console.log(`   ServiceM8 error: ${data.servicem8_status?.error || 'None'}`);
        console.log(`   ServiceM8 synced: ${data.servicem8_status?.synced}`);
      } else {
        console.log(`❌ Admin API returned: ${response.status} ${response.statusText}`);
      }
    } catch (apiTestError) {
      console.log('⚠️ Could not test admin API (server might not be running)');
    }
    
  } catch (error) {
    console.log('💥 Debug script failed:', error);
  }
}

// Run the debug
debugJobsSync().catch((error) => {
  console.error('💥 Debug script crashed:', error);
  process.exit(1);
});
