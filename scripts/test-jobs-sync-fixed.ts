#!/usr/bin/env tsx
/**
 * Test Jobs Sync with Fixed Mapping
 * 
 * This script tests the complete jobs sync process with the fixed field mapping
 */

// Load environment variables first
require('dotenv').config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

async function testJobsSyncFixed(): Promise<void> {
  console.log('🔧 Test Jobs Sync with Fixed Mapping\n');
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
    console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
    console.log('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Present' : 'Missing');
    return;
  }
  
  console.log(`🔑 ServiceM8 API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`🗄️ Supabase URL: ${supabaseUrl}`);
  
  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Step 1: Get jobs from ServiceM8
    console.log('\n📋 1. Getting jobs from ServiceM8...');
    const response = await fetch('https://api.servicem8.com/api_1.0/job.json', {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log(`❌ ServiceM8 API failed: ${response.status} ${response.statusText}`);
      return;
    }
    
    const jobs = await response.json();
    console.log(`✅ Retrieved ${jobs.length} jobs from ServiceM8`);
    
    if (jobs.length === 0) {
      console.log('⚠️ No jobs to sync');
      return;
    }
    
    // Step 2: Check which companies these jobs belong to
    const companyUuids = [...new Set(jobs.map((job: any) => job.company_uuid).filter(Boolean))];
    console.log(`\n📋 2. Jobs belong to ${companyUuids.length} companies:`);
    companyUuids.forEach((uuid, index) => {
      const companyJobs = jobs.filter((job: any) => job.company_uuid === uuid);
      console.log(`   ${index + 1}. Company ${uuid}: ${companyJobs.length} jobs`);
    });
    
    // Step 3: Check if we have customers for these companies
    console.log('\n📋 3. Checking customers in database...');
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, name, email, servicem8_customer_uuid')
      .in('servicem8_customer_uuid', companyUuids);
    
    if (customersError) {
      console.log('❌ Error fetching customers:', customersError);
      return;
    }
    
    console.log(`✅ Found ${customers?.length || 0} matching customers in database`);
    
    if (!customers || customers.length === 0) {
      console.log('⚠️ No matching customers found!');
      console.log('💡 You need to create customers for these companies first:');
      companyUuids.forEach((uuid, index) => {
        console.log(`   ${index + 1}. Company UUID: ${uuid}`);
      });
      
      // Let's create sample customers for testing
      console.log('\n📋 4. Creating sample customers for testing...');
      const customersToCreate = companyUuids.map((uuid, index) => ({
        name: `ServiceM8 Customer ${index + 1}`,
        email: `customer${index + 1}@servicem8.test`,
        phone: `+1234567890${index}`,
        servicem8_customer_uuid: uuid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      const { data: newCustomers, error: createError } = await supabase
        .from('customers')
        .insert(customersToCreate)
        .select();
      
      if (createError) {
        console.log('❌ Error creating customers:', createError);
        return;
      }
      
      console.log(`✅ Created ${newCustomers?.length || 0} customers`);
      
      // Update customers list
      const { data: updatedCustomers } = await supabase
        .from('customers')
        .select('id, name, email, servicem8_customer_uuid')
        .in('servicem8_customer_uuid', companyUuids);
      
      customers.push(...(updatedCustomers || []));
    }
    
    // Step 4: Sync jobs to database
    console.log('\n📋 5. Syncing jobs to database...');
    
    for (const customer of customers) {
      const customerJobs = jobs.filter((job: any) => job.company_uuid === customer.servicem8_customer_uuid);
      
      if (customerJobs.length === 0) continue;
      
      console.log(`\n🔄 Syncing ${customerJobs.length} jobs for ${customer.name}...`);
      
      const jobsToUpsert = customerJobs.map((job: any) => {
        // Map ServiceM8 fields to our database fields (same logic as sync service)
        const jobNumber = job.generated_job_id || job.job_number || job.uuid;
        const dateCreated = job.date || job.quote_date || job.work_order_date;
        const dateModified = job.edit_date;
        const dateCompleted = job.completion_date && job.completion_date !== '0000-00-00 00:00:00' ? job.completion_date : null;
        const staffUuid = job.created_by_staff_uuid || job.staff_uuid;
        const jobTotal = job.generated_job_total || (job.total_invoice_amount ? parseFloat(job.total_invoice_amount) : 0);
        
        console.log(`   📝 Job: ${jobNumber} (${job.status}) - $${jobTotal}`);
        
        return {
          customer_id: customer.id,
          servicem8_job_uuid: job.uuid,
          job_no: jobNumber,
          description: job.job_description || '',
          status: job.status,
          job_address: job.job_address || '',
          generated_job_total: jobTotal,
          date_completed: dateCompleted,
          staff_uuid: staffUuid,
          date_created_sm8: dateCreated,
          date_last_modified_sm8: dateModified,
          updated: dateModified || dateCreated || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });
      
      const { error: upsertError } = await supabase
        .from('jobs')
        .upsert(jobsToUpsert, {
          onConflict: 'servicem8_job_uuid'
        });
      
      if (upsertError) {
        console.log(`❌ Error syncing jobs for ${customer.name}:`, upsertError);
      } else {
        console.log(`✅ Successfully synced ${customerJobs.length} jobs for ${customer.name}`);
      }
    }
    
    // Step 5: Verify jobs in database
    console.log('\n📋 6. Verifying jobs in database...');
    const { data: dbJobs, error: jobsError } = await supabase
      .from('jobs')
      .select(`
        id,
        job_no,
        description,
        status,
        generated_job_total,
        servicem8_job_uuid,
        customers!inner(name, email)
      `)
      .order('updated_at', { ascending: false });
    
    if (jobsError) {
      console.log('❌ Error fetching jobs from database:', jobsError);
    } else {
      console.log(`✅ Total jobs in database: ${dbJobs?.length || 0}`);
      
      if (dbJobs && dbJobs.length > 0) {
        console.log('\n📊 Jobs in database:');
        dbJobs.forEach((job, index) => {
          const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
          console.log(`   ${index + 1}. Job #${job.job_no} - ${job.status}`);
          console.log(`      Customer: ${customer?.name || 'Unknown'}`);
          console.log(`      Description: ${job.description}`);
          console.log(`      Total: $${job.generated_job_total || 0}`);
          console.log(`      ServiceM8 UUID: ${job.servicem8_job_uuid}`);
          console.log('');
        });
      }
    }
    
    console.log('\n🎉 Jobs sync test completed!');
    console.log('💡 Now try visiting /admin/jobs in your app to see the synced jobs');
    
  } catch (error) {
    console.log('💥 Test failed:', error);
  }
}

// Run the test
testJobsSyncFixed().catch((error) => {
  console.error('💥 Test script crashed:', error);
  process.exit(1);
});
