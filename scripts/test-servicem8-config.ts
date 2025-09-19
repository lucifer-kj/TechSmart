#!/usr/bin/env tsx

/**
 * Test ServiceM8 Configuration
 * 
 * This script validates that the ServiceM8 API key works and can fetch company information.
 * Run with: npm run test-servicem8-config
 */

import { config } from 'dotenv';
import { getServiceM8Config, validateServiceM8ApiKey } from '../lib/servicem8-config';

// Load environment variables
config();

async function testServiceM8Config() {
  console.log('🧪 Testing ServiceM8 Configuration...\n');

  const apiKey = process.env.SERVICEM8_API_KEY;

  if (!apiKey) {
    console.log('❌ No SERVICEM8_API_KEY found in environment variables');
    console.log('   Add SERVICEM8_API_KEY=your_api_key to your .env file');
    console.log('   The app will use mock data without this key\n');
    return;
  }

  console.log('✅ SERVICEM8_API_KEY found');
  console.log(`   Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}\n`);

  // Test API key validation
  console.log('🔍 Validating API key...');
  try {
    const validation = await validateServiceM8ApiKey(apiKey);
    
    if (validation.valid) {
      console.log('✅ API key is valid');
    } else {
      console.log('❌ API key validation failed:');
      console.log(`   Error: ${validation.error}\n`);
      return;
    }
  } catch (error) {
    console.log('❌ API key validation error:');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    return;
  }

  // Test configuration fetching
  console.log('🔍 Fetching ServiceM8 configuration...');
  try {
    const config = await getServiceM8Config();
    
    if (config) {
      console.log('✅ ServiceM8 configuration loaded successfully:');
      console.log(`   Company UUID: ${config.companyUuid}`);
      console.log(`   Company Name: ${config.companyName}`);
      console.log(`   Company Email: ${config.companyEmail}`);
      console.log(`   Company Phone: ${config.companyPhone}`);
      console.log(`   Company Address: ${config.companyAddress}`);
      console.log(`   Is Active: ${config.isActive}`);
      console.log(`   Base URL: ${config.baseUrl}\n`);
      
      console.log('🎉 ServiceM8 integration is working correctly!');
      console.log('   Your app will now use real ServiceM8 data instead of mock data.\n');
    } else {
      console.log('❌ Failed to load ServiceM8 configuration');
      console.log('   The app will fall back to mock data\n');
    }
  } catch (error) {
    console.log('❌ Configuration fetch error:');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log('   The app will fall back to mock data\n');
  }
}

// Run the test
testServiceM8Config().catch(console.error);
