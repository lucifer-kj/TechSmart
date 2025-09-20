#!/usr/bin/env tsx
/**
 * Direct Jobs API Test
 * 
 * This script directly tests the ServiceM8 jobs API to see what data we get
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testJobsDirectly(): Promise<void> {
  console.log('🔧 Direct ServiceM8 Jobs API Test\n');
  console.log('=' .repeat(50));
  
  const apiKey = process.env.SERVICEM8_API_KEY;
  
  if (!apiKey) {
    console.log('❌ SERVICEM8_API_KEY not found in environment variables');
    return;
  }
  
  console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...`);
  
  try {
    // Test the exact URL you mentioned
    console.log('\n📡 Testing: https://api.servicem8.com/api_1.0/job.json');
    
    const response = await fetch('https://api.servicem8.com/api_1.0/job.json', {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error Response:', errorText);
      
      if (response.status === 401) {
        console.log('\n💡 Troubleshooting 401 (Unauthorized):');
        console.log('   • Check if your API key is correct');
        console.log('   • Ensure the API key has job access permissions');
        console.log('   • Verify your ServiceM8 account is active');
      } else if (response.status === 402) {
        console.log('\n💡 Troubleshooting 402 (Payment Required):');
        console.log('   • Your ServiceM8 account may have billing issues');
        console.log('   • Check your ServiceM8 subscription status');
      }
      return;
    }
    
    const jobs = await response.json();
    console.log(`✅ Success! Retrieved ${jobs.length} jobs\n`);
    
    if (jobs.length > 0) {
      console.log('📊 Job Statistics:');
      const statuses = jobs.reduce((acc: Record<string, number>, job: any) => {
        const status = job.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(statuses).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} jobs`);
      });
      
      console.log('\n📋 Sample Jobs (first 3):');
      jobs.slice(0, 3).forEach((job: any, index: number) => {
        console.log(`\n   ${index + 1}. Job #${job.job_number || job.uuid}`);
        console.log(`      UUID: ${job.uuid}`);
        console.log(`      Status: ${job.status || 'No status'}`);
        console.log(`      Description: ${job.job_description || 'No description'}`);
        console.log(`      Company UUID: ${job.company_uuid || 'No company'}`);
        console.log(`      Total: $${job.generated_job_total || '0'}`);
        console.log(`      Created: ${job.date_created || 'Unknown'}`);
        console.log(`      Modified: ${job.date_last_modified || 'Unknown'}`);
      });
      
      console.log('\n🔍 Full Structure of First Job:');
      console.log(JSON.stringify(jobs[0], null, 2));
      
      // Test filtering by company (if we have company UUIDs)
      const companiesWithJobs = [...new Set(jobs.map((job: any) => job.company_uuid).filter(Boolean))];
      console.log(`\n🏢 Found jobs for ${companiesWithJobs.length} different companies:`);
      companiesWithJobs.slice(0, 5).forEach((companyUuid, index) => {
        const companyJobs = jobs.filter((job: any) => job.company_uuid === companyUuid);
        console.log(`   ${index + 1}. Company ${companyUuid}: ${companyJobs.length} jobs`);
      });
      
    } else {
      console.log('⚠️ No jobs found in ServiceM8 account');
      console.log('💡 This could mean:');
      console.log('   • No jobs have been created in ServiceM8');
      console.log('   • Your API key doesn\'t have access to jobs');
      console.log('   • Jobs are filtered out by some criteria');
    }
    
  } catch (error: any) {
    console.log('❌ API test failed:', error.message);
    console.log('🔧 This could be due to:');
    console.log('   • Network connectivity issues');
    console.log('   • Invalid API key format');
    console.log('   • ServiceM8 API service issues');
  }
}

// Run the test
testJobsDirectly().catch((error) => {
  console.error('💥 Test script crashed:', error);
  process.exit(1);
});
