#!/usr/bin/env tsx
/**
 * ServiceM8 Attachments API Test
 * 
 * This script tests the ServiceM8 attachments API for documents
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testAttachments(): Promise<void> {
  console.log('🔧 ServiceM8 Attachments API Test\n');
  console.log('=' .repeat(50));
  
  const apiKey = process.env.SERVICEM8_API_KEY;
  
  if (!apiKey) {
    console.log('❌ SERVICEM8_API_KEY not found in environment variables');
    return;
  }
  
  console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...`);
  
  const endpoints = [
    'https://api.servicem8.com/api_1.0/attachment.json',
    'https://api.servicem8.com/api_1.0/document.json',
    'https://api.servicem8.com/api_1.0/photo.json'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Testing: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Error Response: ${errorText}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`✅ Success! Retrieved ${data.length} items`);
      
      if (data.length > 0) {
        console.log('\n📄 Sample item structure:');
        console.log(JSON.stringify(data[0], null, 2));
        
        console.log('\n📋 Sample items (first 3):');
        data.slice(0, 3).forEach((item: any, index: number) => {
          console.log(`\n   ${index + 1}. ${item.file_name || item.name || item.title || 'Unnamed'}`);
          console.log(`      UUID: ${item.uuid}`);
          console.log(`      Related Object: ${item.related_object_uuid || item.job_uuid || 'N/A'}`);
          console.log(`      Type: ${item.file_type || item.attachment_source || item.type || 'Unknown'}`);
          console.log(`      Size: ${item.file_size || 'Unknown'}`);
          console.log(`      Created: ${item.date_created || 'Unknown'}`);
        });
      }
      
    } catch (error: any) {
      console.log(`❌ ${endpoint} failed:`, error.message);
    }
  }
}

// Run the test
testAttachments().catch((error) => {
  console.error('💥 Test script crashed:', error);
  process.exit(1);
});
