#!/usr/bin/env tsx
/**
 * ServiceM8 Jobs API Test
 * 
 * This script directly tests the ServiceM8 jobs API to see what data we're getting
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

import { ServiceM8Client } from '../lib/servicem8';

async function testServiceM8Jobs(): Promise<void> {
  console.log('🔧 ServiceM8 Jobs API Test\n');
  console.log('=' .repeat(50));
  
  const apiKey = process.env.SERVICEM8_API_KEY;
  
  if (!apiKey) {
    console.log('❌ SERVICEM8_API_KEY not found in environment variables');
    return;
  }
  
  console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...`);
  
  try {
    const client = new ServiceM8Client(apiKey);
    
    // Test 1: Get all jobs
    console.log('\n📋 1. Fetching all jobs from ServiceM8...');
    const startTime = Date.now();
    
    // Direct API call to jobs endpoint
    const response = await fetch('https://api.servicem8.com/api_1.0/job.json', {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const jobs = await response.json();
    const endTime = Date.now();
    
    console.log(`✅ Success! Retrieved ${jobs.length} jobs in ${endTime - startTime}ms\n`);
    
    if (jobs.length > 0) {
      console.log('📄 Sample job data structure:');
      const sampleJob = jobs[0];
      console.log(JSON.stringify(sampleJob, null, 2));
      
      console.log('\n📊 Job Statistics:');
      const statuses = jobs.reduce((acc: Record<string, number>, job: any) => {
        const status = job.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(statuses).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} jobs`);
      });
      
      console.log('\n📋 First 3 jobs:');
      jobs.slice(0, 3).forEach((job: any, index: number) => {
        console.log(`   ${index + 1}. Job #${job.job_number || job.uuid}`);
        console.log(`      Status: ${job.status || 'No status'}`);
        console.log(`      Description: ${job.job_description || 'No description'}`);
        console.log(`      Company: ${job.company_uuid || 'No company'}`);
        console.log(`      Total: $${job.generated_job_total || '0'}`);
        console.log(`      Created: ${job.date_created || 'Unknown'}`);
        console.log('');
      });
      
      // Test 2: Check if we have the getJobDetails method working
      console.log('\n📋 2. Testing getJobDetails method...');
      const firstJobUuid = jobs[0].uuid;
      if (firstJobUuid) {
        try {
          const jobDetails = await client.getJobDetails(firstJobUuid);
          console.log('✅ getJobDetails method works!');
          console.log('📄 Job details structure:');
          console.log(JSON.stringify(jobDetails, null, 2));
        } catch (error) {
          console.log('❌ getJobDetails method failed:', error);
        }
      }
      
    } else {
      console.log('⚠️ No jobs found in ServiceM8 account');
    }
    
  } catch (error: any) {
    console.log('❌ ServiceM8 Jobs API test failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Status: ${error.status || 'Unknown'}`);
    
    if (error.status === 401) {
      console.log('\n💡 Troubleshooting 401 (Unauthorized):');
      console.log('   • Check if your API key is correct');
      console.log('   • Ensure the API key hasn\'t expired');
      console.log('   • Verify the API key has job access permissions');
    } else if (error.status === 402) {
      console.log('\n💡 Troubleshooting 402 (Payment Required):');
      console.log('   • Your ServiceM8 account may have billing issues');
      console.log('   • Check your ServiceM8 subscription status');
    }
  }
}

// Run the test
testServiceM8Jobs().catch((error) => {
  console.error('💥 Test script crashed:', error);
  process.exit(1);
});
