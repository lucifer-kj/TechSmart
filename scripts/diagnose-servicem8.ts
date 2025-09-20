#!/usr/bin/env tsx
/**
 * ServiceM8 API Diagnostic Tool
 * 
 * This script provides comprehensive diagnostics for ServiceM8 API issues
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

import { ServiceM8Client } from '../lib/servicem8';

interface DiagnosticResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

async function runDiagnostics(): Promise<void> {
  console.log('🔍 ServiceM8 API Diagnostic Tool\n');
  console.log('=' .repeat(50));
  
  const results: DiagnosticResult[] = [];
  
  // Test 1: Environment Variables
  console.log('\n📋 1. Checking Environment Variables...');
  const apiKey = process.env.SERVICEM8_API_KEY;
  
  if (!apiKey) {
    results.push({
      test: 'API Key Environment',
      status: 'FAIL',
      message: 'SERVICEM8_API_KEY not found in environment variables'
    });
    console.log('❌ SERVICEM8_API_KEY not found');
  } else {
    results.push({
      test: 'API Key Environment',
      status: 'PASS',
      message: `API Key found: ${apiKey.substring(0, 8)}...`
    });
    console.log(`✅ API Key found: ${apiKey.substring(0, 8)}...`);
    
    // Test 2: API Key Format
    console.log('\n📋 2. Validating API Key Format...');
    if (!apiKey.startsWith('smk-')) {
      results.push({
        test: 'API Key Format',
        status: 'WARN',
        message: 'API Key should start with "smk-"'
      });
      console.log('⚠️ API Key should start with "smk-"');
    } else {
      results.push({
        test: 'API Key Format',
        status: 'PASS',
        message: 'API Key format appears correct'
      });
      console.log('✅ API Key format appears correct');
    }
    
    // Test 3: API Connection Test
    console.log('\n📋 3. Testing API Connection...');
    try {
      const client = new ServiceM8Client(apiKey);
      console.log('📡 Attempting to connect to ServiceM8 API...');
      
      const startTime = Date.now();
      const clients = await client.listClients();
      const endTime = Date.now();
      
      results.push({
        test: 'API Connection',
        status: 'PASS',
        message: `Successfully connected and retrieved ${clients.length} clients in ${endTime - startTime}ms`,
        details: {
          clientCount: clients.length,
          responseTime: endTime - startTime
        }
      });
      
      console.log(`✅ Success! Retrieved ${clients.length} clients in ${endTime - startTime}ms`);
      
      // Test 4: Sample Client Data
      if (clients.length > 0) {
        console.log('\n📋 4. Sample Client Data...');
        const sampleClient = clients[0];
        console.log('📄 First client details:');
        console.log(`   Name: ${sampleClient.name}`);
        console.log(`   UUID: ${sampleClient.uuid}`);
        console.log(`   Email: ${sampleClient.email || 'No email'}`);
        console.log(`   Phone: ${sampleClient.mobile || 'No phone'}`);
        console.log(`   Active: ${sampleClient.active ? 'Yes' : 'No'}`);
        
        results.push({
          test: 'Sample Data',
          status: 'PASS',
          message: 'Client data structure is valid'
        });
      } else {
        results.push({
          test: 'Sample Data',
          status: 'WARN',
          message: 'No clients found in ServiceM8 account'
        });
        console.log('⚠️ No clients found in ServiceM8 account');
      }
      
    } catch (error: any) {
      results.push({
        test: 'API Connection',
        status: 'FAIL',
        message: error.message || 'Unknown error',
        details: {
          status: error.status,
          code: error.code,
          retryable: error.retryable,
          fullError: error
        }
      });
      
      console.log('❌ API Connection failed:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Status: ${error.status}`);
      console.log(`   Code: ${error.code}`);
      
      // Provide specific troubleshooting based on error
      if (error.status === 401) {
        console.log('\n💡 Troubleshooting 401 (Unauthorized):');
        console.log('   • Check if your API key is correct');
        console.log('   • Ensure the API key hasn\'t expired');
        console.log('   • Verify the API key has proper permissions');
        console.log('   • Check if your ServiceM8 account is active');
      } else if (error.status === 402) {
        console.log('\n💡 Troubleshooting 402 (Payment Required):');
        console.log('   • Your ServiceM8 account may have billing issues');
        console.log('   • Check your ServiceM8 subscription status');
        console.log('   • Contact ServiceM8 support for billing assistance');
        console.log('   • Verify your payment method is up to date');
      } else if (error.status === 403) {
        console.log('\n💡 Troubleshooting 403 (Forbidden):');
        console.log('   • Your API key may not have sufficient permissions');
        console.log('   • Check API key scopes in ServiceM8 settings');
      } else if (error.status === 429) {
        console.log('\n💡 Troubleshooting 429 (Rate Limited):');
        console.log('   • You\'ve exceeded the API rate limit');
        console.log('   • Wait a few minutes before trying again');
        console.log('   • Consider implementing rate limiting in your app');
      }
    }
  }
  
  // Test 5: Network Connectivity
  console.log('\n📋 5. Testing Network Connectivity...');
  try {
    const response = await fetch('https://api.servicem8.com/', {
      method: 'HEAD',
      headers: {
        'User-Agent': 'ServiceM8-Diagnostic-Tool'
      }
    });
    
    if (response.ok || response.status === 401) {
      results.push({
        test: 'Network Connectivity',
        status: 'PASS',
        message: 'Can reach ServiceM8 API servers'
      });
      console.log('✅ Can reach ServiceM8 API servers');
    } else {
      results.push({
        test: 'Network Connectivity',
        status: 'WARN',
        message: `Unexpected response: ${response.status}`
      });
      console.log(`⚠️ Unexpected response: ${response.status}`);
    }
  } catch (error) {
    results.push({
      test: 'Network Connectivity',
      status: 'FAIL',
      message: 'Cannot reach ServiceM8 API servers',
      details: error
    });
    console.log('❌ Cannot reach ServiceM8 API servers');
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('=' .repeat(50));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️ Warnings: ${warnings}`);
  
  if (failed > 0) {
    console.log('\n🔧 FAILED TESTS:');
    results.filter(r => r.status === 'FAIL').forEach(result => {
      console.log(`   ❌ ${result.test}: ${result.message}`);
    });
  }
  
  if (warnings > 0) {
    console.log('\n⚠️ WARNINGS:');
    results.filter(r => r.status === 'WARN').forEach(result => {
      console.log(`   ⚠️ ${result.test}: ${result.message}`);
    });
  }
  
  console.log('\n📋 Next Steps:');
  if (failed === 0 && warnings === 0) {
    console.log('   🎉 All tests passed! Your ServiceM8 API is working correctly.');
    console.log('   🔄 Try refreshing your admin customers page.');
  } else if (failed > 0) {
    console.log('   🔧 Fix the failed tests above before proceeding.');
    console.log('   📞 If issues persist, contact ServiceM8 support.');
  } else {
    console.log('   ⚠️ Address warnings if possible, but API should still work.');
  }
  
  console.log('\n📞 ServiceM8 Support: https://www.servicem8.com/support/');
  console.log('📖 API Documentation: https://developer.servicem8.com/');
}

// Run diagnostics
runDiagnostics().catch((error) => {
  console.error('💥 Diagnostic tool crashed:', error);
  process.exit(1);
});
