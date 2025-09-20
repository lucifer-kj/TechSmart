#!/usr/bin/env tsx
/**
 * Test Quotes Sync with ServiceM8 Attachments
 * 
 * This script tests the quotes sync using ServiceM8 attachments API
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

async function testQuotesSync(): Promise<void> {
  console.log('🔧 Test Quotes Sync with ServiceM8 Attachments\n');
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
    // Step 1: Test the admin quotes API with sync
    console.log('\n📋 1. Testing admin quotes API with sync...');
    
    const response = await fetch('http://localhost:3000/api/admin/quotes?sync=true', {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Admin quotes API response:');
      console.log(`   Total quotes: ${data.quotes?.length || 0}`);
      console.log(`   ServiceM8 available: ${data.servicem8_status?.available}`);
      console.log(`   ServiceM8 error: ${data.servicem8_status?.error || 'None'}`);
      console.log(`   ServiceM8 synced: ${data.servicem8_status?.synced}`);
      
      if (data.quotes && data.quotes.length > 0) {
        console.log('\n📄 Sample quotes:');
        data.quotes.slice(0, 3).forEach((quote: any, index: number) => {
          console.log(`   ${index + 1}. ${quote.attachment_name} (${quote.file_type})`);
          console.log(`      Customer: ${quote.customer_name || 'Unknown'}`);
          console.log(`      Job: #${quote.job_number || 'Unknown'}`);
          console.log(`      Favourite: ${quote.is_favourite === '1' ? 'Yes' : 'No'}`);
          console.log(`      Active: ${quote.active === 1 ? 'Yes' : 'No'}`);
          if (quote.photo_width && quote.photo_height) {
            console.log(`      Dimensions: ${quote.photo_width}x${quote.photo_height}`);
          }
          if (quote.tags) console.log(`      Tags: ${quote.tags}`);
        });
      }
    } else {
      console.log(`❌ Admin API returned: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`   Error: ${errorText}`);
    }
    
    // Step 2: Check quotes in database
    console.log('\n📋 2. Checking quotes in database...');
    const { data: dbQuotes, error: quotesError } = await supabase
      .from('documents')
      .select(`
        id,
        file_name,
        type,
        attachment_source,
        servicem8_attachment_uuid,
        metadata,
        customers!inner(name, email),
        jobs!inner(job_no, description)
      `)
      .eq('type', 'quote')
      .order('created_at', { ascending: false });
    
    if (quotesError) {
      console.log('❌ Error fetching quotes from database:', quotesError);
    } else {
      console.log(`✅ Found ${dbQuotes?.length || 0} quotes in database`);
      
      if (dbQuotes && dbQuotes.length > 0) {
        console.log('\n📊 Quote file types breakdown:');
        const typeCount = dbQuotes.reduce((acc: Record<string, number>, quote) => {
          const type = quote.file_type || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});
        
        Object.entries(typeCount).forEach(([type, count]) => {
          console.log(`   ${type}: ${count} quotes`);
        });
        
        console.log('\n📋 Sample quotes from database:');
        dbQuotes.slice(0, 3).forEach((quote, index) => {
          const customer = Array.isArray(quote.customers) ? quote.customers[0] : quote.customers;
          const job = Array.isArray(quote.jobs) ? quote.jobs[0] : quote.jobs;
          const metadata = quote.metadata as Record<string, unknown> || {};
          
          console.log(`   ${index + 1}. ${quote.file_name}`);
          console.log(`      Source: ${quote.attachment_source}`);
          console.log(`      Customer: ${customer?.name || 'Unknown'}`);
          console.log(`      Job: #${job?.job_no || 'Unknown'}`);
          console.log(`      ServiceM8 UUID: ${quote.servicem8_attachment_uuid}`);
          console.log(`      Favourite: ${metadata.is_favourite === '1' ? 'Yes' : 'No'}`);
          console.log(`      Active: ${metadata.active === 1 ? 'Yes' : 'No'}`);
        });
      }
    }
    
    console.log('\n🎉 Quotes sync test completed!');
    console.log('💡 Now try visiting /admin/quotes in your app to see the synced attachments');
    
  } catch (error) {
    console.log('💥 Test failed:', error);
  }
}

// Run the test
testQuotesSync().catch((error) => {
  console.error('💥 Test script crashed:', error);
  process.exit(1);
});
