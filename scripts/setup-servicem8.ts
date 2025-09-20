#!/usr/bin/env tsx
/**
 * ServiceM8 Setup Script
 * 
 * This script helps set up ServiceM8 API integration and test the connection.
 * Run with: npx tsx scripts/setup-servicem8.ts
 */

import { ServiceM8Client } from '@/lib/servicem8';

async function testServiceM8Connection(apiKey: string) {
  console.log('🔍 Testing ServiceM8 API connection...');
  
  try {
    const client = new ServiceM8Client(apiKey);
    
    // Test basic connection by fetching clients
    const clients = await client.listClients(5, 0);
    
    console.log('✅ ServiceM8 API connection successful!');
    console.log(`📊 Found ${clients.length} clients in your ServiceM8 account`);
    
    if (clients.length > 0) {
      console.log('\n📋 Sample clients:');
      clients.slice(0, 3).forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.name} (${client.email || 'No email'}) - UUID: ${client.uuid}`);
      });
    }
    
    return { success: true, clientCount: clients.length };
  } catch (error) {
    console.error('❌ ServiceM8 API connection failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function main() {
  console.log('🚀 ServiceM8 Setup and Test\n');
  
  // Check if API key is already configured
  const existingApiKey = process.env.SERVICEM8_API_KEY;
  
  if (existingApiKey) {
    console.log('✅ ServiceM8 API key found in environment');
    console.log('🔍 Testing existing connection...\n');
    
    const result = await testServiceM8Connection(existingApiKey);
    
    if (result.success) {
      console.log('\n🎉 ServiceM8 is properly configured and working!');
      console.log(`📈 Your account has ${result.clientCount} clients`);
      console.log('\n💡 Tips:');
      console.log('   - Visit /admin/customers to see your clients');
      console.log('   - Add ?sync=true to sync with ServiceM8');
      console.log('   - The API will automatically fetch ServiceM8 data when available');
    } else {
      console.log('\n❌ ServiceM8 configuration issue detected');
      console.log('🔧 Please check:');
      console.log('   1. Your API key is valid');
      console.log('   2. Your ServiceM8 account has active clients');
      console.log('   3. Your API key has the necessary permissions');
    }
  } else {
    console.log('⚠️ ServiceM8 API key not found in environment');
    console.log('\n🔧 To set up ServiceM8 integration:');
    console.log('   1. Create a .env.local file in your project root');
    console.log('   2. Add your ServiceM8 API key:');
    console.log('      SERVICEM8_API_KEY=your_api_key_here');
    console.log('   3. Restart your development server');
    console.log('\n📚 Get your API key from: https://developer.servicem8.com/');
    console.log('\n💡 Without the API key, the system will use local database data only');
  }
  
  console.log('\n🏁 Setup complete!');
}

// Run the script
main().catch(console.error);
