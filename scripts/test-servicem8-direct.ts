#!/usr/bin/env node
/**
 * Direct ServiceM8 API Test
 * 
 * This script directly tests the ServiceM8 API connection without going through our app.
 */

const { ServiceM8Client } = require('../lib/servicem8');

// Define the client type to avoid TypeScript errors
interface ServiceM8ClientData {
  uuid: string;
  name: string;
  email: string;
  mobile: string;
  active: number;
}

async function testDirectServiceM8() {
  console.log('🧪 Direct ServiceM8 API Test\n');
  
  const apiKey = process.env.SERVICEM8_API_KEY;
  
  if (!apiKey) {
    console.error('❌ SERVICEM8_API_KEY not found in environment');
    process.exit(1);
  }
  
  console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...`);
  console.log('🌐 Testing connection to ServiceM8...\n');
  
  try {
    const client = new ServiceM8Client(apiKey);
    
    console.log('📡 Calling ServiceM8 listClients()...');
    const startTime = Date.now();
    
    const clients = await client.listClients(10, 0);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Success! Retrieved ${clients.length} clients in ${duration}ms\n`);
    
    if (clients.length > 0) {
      console.log('📋 First few clients:');
      clients.slice(0, 3).forEach((client: ServiceM8ClientData, index: number) => {
        console.log(`   ${index + 1}. ${client.name}`);
        console.log(`      UUID: ${client.uuid}`);
        console.log(`      Email: ${client.email || 'No email'}`);
        console.log(`      Phone: ${client.mobile || 'No phone'}`);
        console.log(`      Active: ${client.active ? 'Yes' : 'No'}`);
        console.log('');
      });
    } else {
      console.log('⚠️ No clients found in your ServiceM8 account');
    }
    
    // Test individual client fetch
    if (clients.length > 0) {
      console.log('🔍 Testing individual client fetch...');
      const firstClient = clients[0];
      const individualClient = await client.getClient(firstClient.uuid);
      console.log(`✅ Individual client fetch successful: ${individualClient.name}`);
    }
    
    console.log('\n🎉 All tests passed! ServiceM8 API is working correctly.');
    
  } catch (error) {
    console.error('❌ ServiceM8 API test failed:');
    console.error(error);
    
    if (error instanceof Error) {
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Check your API key is valid');
      console.log('2. Ensure your ServiceM8 account has active clients');
      console.log('3. Verify network connectivity');
      console.log('4. Check ServiceM8 API status');
    }
    
    process.exit(1);
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

testDirectServiceM8();
