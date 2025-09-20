#!/usr/bin/env tsx
/**
 * Test Documents Sync with Job Materials
 * 
 * This script tests the documents sync using ServiceM8 job materials API
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

async function testDocumentsSync(): Promise<void> {
  console.log('🔧 Test Documents Sync with Job Materials\n');
  console.log('=' .repeat(60));
  
  const apiKey = process.env.SERVICEM8_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing required environment variables');
    return;
  }
  
  console.log(`🔑 ServiceM8 API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`🗄️ Supabase URL: ${supabaseUrl}`);
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Step 1: Test the admin documents API with sync
    console.log('\n📋 1. Testing admin documents API with sync...');
    
    const response = await fetch('http://localhost:3000/api/admin/documents?sync=true', {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Admin documents API response:');
      console.log(`   Total documents: ${data.documents?.length || 0}`);
      console.log(`   ServiceM8 available: ${data.servicem8_status?.available}`);
      console.log(`   ServiceM8 error: ${data.servicem8_status?.error || 'None'}`);
      console.log(`   ServiceM8 synced: ${data.servicem8_status?.synced}`);
      
      if (data.documents && data.documents.length > 0) {
        console.log('\n📄 Sample documents:');
        data.documents.slice(0, 3).forEach((doc: any, index: number) => {
          console.log(`   ${index + 1}. ${doc.file_name} (${doc.type})`);
          console.log(`      Source: ${doc.attachment_source}`);
          console.log(`      Customer: ${doc.customer_name}`);
          console.log(`      Job: #${doc.job_number}`);
          if (doc.quantity) console.log(`      Quantity: ${doc.quantity}`);
          if (doc.displayed_amount) console.log(`      Amount: $${doc.displayed_amount}`);
        });
      }
    } else {
      console.log(`❌ Admin API returned: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`   Error: ${errorText}`);
    }
    
    // Step 2: Check documents in database
    console.log('\n📋 2. Checking documents in database...');
    const { data: dbDocuments, error: docsError } = await supabase
      .from('documents')
      .select(`
        id,
        file_name,
        type,
        attachment_source,
        servicem8_attachment_uuid,
        customers!inner(name, email),
        jobs!inner(job_no, description)
      `)
      .order('created_at', { ascending: false });
    
    if (docsError) {
      console.log('❌ Error fetching documents from database:', docsError);
    } else {
      console.log(`✅ Found ${dbDocuments?.length || 0} documents in database`);
      
      if (dbDocuments && dbDocuments.length > 0) {
        console.log('\n📊 Document types breakdown:');
        const typeCount = dbDocuments.reduce((acc: Record<string, number>, doc) => {
          const type = doc.type || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});
        
        Object.entries(typeCount).forEach(([type, count]) => {
          console.log(`   ${type}: ${count} documents`);
        });
        
        console.log('\n📋 Sample documents from database:');
        dbDocuments.slice(0, 3).forEach((doc, index) => {
          const customer = Array.isArray(doc.customers) ? doc.customers[0] : doc.customers;
          const job = Array.isArray(doc.jobs) ? doc.jobs[0] : doc.jobs;
          console.log(`   ${index + 1}. ${doc.file_name} (${doc.type})`);
          console.log(`      Source: ${doc.attachment_source}`);
          console.log(`      Customer: ${customer?.name || 'Unknown'}`);
          console.log(`      Job: #${job?.job_no || 'Unknown'}`);
          console.log(`      ServiceM8 UUID: ${doc.servicem8_attachment_uuid}`);
        });
      }
    }
    
    console.log('\n🎉 Documents sync test completed!');
    console.log('💡 Now try visiting /admin/documents in your app to see the synced materials');
    
  } catch (error) {
    console.log('💥 Test failed:', error);
  }
}

// Run the test
testDocumentsSync().catch((error) => {
  console.error('💥 Test script crashed:', error);
  process.exit(1);
});
