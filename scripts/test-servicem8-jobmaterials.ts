#!/usr/bin/env tsx
/**
 * ServiceM8 Job Materials API Test
 * 
 * This script tests the ServiceM8 job materials API to understand the data structure
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testJobMaterials(): Promise<void> {
  console.log('🔧 ServiceM8 Job Materials API Test\n');
  console.log('=' .repeat(50));
  
  const apiKey = process.env.SERVICEM8_API_KEY;
  
  if (!apiKey) {
    console.log('❌ SERVICEM8_API_KEY not found in environment variables');
    return;
  }
  
  console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...`);
  
  try {
    // Test the job materials API
    console.log('\n📡 Testing: https://api.servicem8.com/api_1.0/jobmaterial.json');
    
    const response = await fetch('https://api.servicem8.com/api_1.0/jobmaterial.json', {
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
      return;
    }
    
    const jobMaterials = await response.json();
    console.log(`✅ Success! Retrieved ${jobMaterials.length} job materials\n`);
    
    if (jobMaterials.length > 0) {
      console.log('📊 Job Materials Statistics:');
      
      // Group by job UUID
      const jobGroups = jobMaterials.reduce((acc: Record<string, any[]>, material: any) => {
        const jobUuid = material.job_uuid || 'unknown';
        if (!acc[jobUuid]) acc[jobUuid] = [];
        acc[jobUuid].push(material);
        return acc;
      }, {});
      
      console.log(`   Total materials: ${jobMaterials.length}`);
      console.log(`   Across ${Object.keys(jobGroups).length} jobs`);
      
      // Show material types/categories if available
      const materialTypes = [...new Set(jobMaterials.map((m: any) => m.name || m.description || 'Unknown').filter(Boolean))];
      console.log(`   Material types: ${materialTypes.length}`);
      
      console.log('\n📋 Sample Job Materials (first 3):');
      jobMaterials.slice(0, 3).forEach((material: any, index: number) => {
        console.log(`\n   ${index + 1}. Material: ${material.name || material.description || 'Unnamed'}`);
        console.log(`      UUID: ${material.uuid}`);
        console.log(`      Job UUID: ${material.job_uuid}`);
        console.log(`      Description: ${material.description || 'No description'}`);
        console.log(`      Quantity: ${material.qty || 0}`);
        console.log(`      Cost (ex tax): $${material.cost_ex_tax || 0}`);
        console.log(`      Total (inc tax): $${material.total_inc_tax || 0}`);
        console.log(`      Date Created: ${material.date_created || 'Unknown'}`);
      });
      
      console.log('\n🔍 Full Structure of First Job Material:');
      console.log(JSON.stringify(jobMaterials[0], null, 2));
      
      // Check if any materials might be documents/attachments
      const potentialDocuments = jobMaterials.filter((material: any) => {
        const name = (material.name || material.description || '').toLowerCase();
        return name.includes('document') || 
               name.includes('attachment') || 
               name.includes('file') ||
               name.includes('pdf') ||
               name.includes('photo') ||
               name.includes('image');
      });
      
      if (potentialDocuments.length > 0) {
        console.log(`\n📄 Found ${potentialDocuments.length} potential document-related materials:`);
        potentialDocuments.forEach((doc: any, index: number) => {
          console.log(`   ${index + 1}. ${doc.name || doc.description}`);
        });
      }
      
      // Show jobs with materials
      console.log(`\n🏢 Jobs with materials:`);
      Object.entries(jobGroups).slice(0, 5).forEach(([jobUuid, materials], index) => {
        const materialsArray = materials as any[];
        console.log(`   ${index + 1}. Job ${jobUuid}: ${materialsArray.length} materials`);
        materialsArray.slice(0, 2).forEach((material: any) => {
          console.log(`      - ${material.name || material.description || 'Unnamed'} ($${material.total_inc_tax || 0})`);
        });
      });
      
    } else {
      console.log('⚠️ No job materials found');
      console.log('💡 This could mean:');
      console.log('   • No materials have been added to jobs');
      console.log('   • Your API key doesn\'t have access to job materials');
      console.log('   • Materials are filtered out by some criteria');
    }
    
  } catch (error: any) {
    console.log('❌ API test failed:', error.message);
  }
}

// Run the test
testJobMaterials().catch((error) => {
  console.error('💥 Test script crashed:', error);
  process.exit(1);
});
