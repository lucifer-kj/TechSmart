#!/usr/bin/env tsx
/**
 * Environment Variables Check Script
 * 
 * This script verifies that all required environment variables are set.
 * Run with: npm run check-env
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: '.env.local' });

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  example?: string;
}

const requiredEnvVars: EnvVar[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    example: 'https://your-project.supabase.co'
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous key',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  {
    name: 'SERVICEM8_API_KEY',
    required: false,
    description: 'ServiceM8 API key (optional for development)',
    example: 'your_servicem8_api_key'
  },
  {
    name: 'SERVICEM8_CUSTOMER_UUID',
    required: false,
    description: 'Default customer UUID for development',
    example: 'company-123'
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: false,
    description: 'Application URL',
    example: 'http://localhost:3000'
  },
  {
    name: 'NODE_ENV',
    required: false,
    description: 'Node environment',
    example: 'development'
  }
];

const checkEnvironment = () => {
  console.log('🔍 Checking environment variables...\n');
  
  const envFile = join(process.cwd(), '.env.local');
  const hasEnvFile = existsSync(envFile);
  
  if (!hasEnvFile) {
    console.log('❌ .env.local file not found!');
    console.log('   Please create a .env.local file with your environment variables.');
    console.log('   You can copy from env.example: cp env.example .env.local\n');
    return false;
  }
  
  console.log('✅ .env.local file found\n');
  
  let allRequired = true;
  
  console.log('📋 Environment Variables Status:\n');
  
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar.name];
    const status = value ? '✅' : '❌';
    const required = envVar.required ? '(Required)' : '(Optional)';
    
    console.log(`${status} ${envVar.name} ${required}`);
    console.log(`   ${envVar.description}`);
    
    if (value) {
      // Show first few characters for security
      const displayValue = value.length > 20 
        ? `${value.substring(0, 20)}...` 
        : value;
      console.log(`   Value: ${displayValue}`);
    } else {
      if (envVar.example) {
        console.log(`   Example: ${envVar.example}`);
      }
      
      if (envVar.required) {
        allRequired = false;
      }
    }
    
    console.log('');
  });
  
  // Check for development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasServiceM8Key = !!process.env.SERVICEM8_API_KEY;
  const hasCustomerUuid = !!process.env.SERVICEM8_CUSTOMER_UUID;
  
  console.log('🔧 Development Mode Status:\n');
  console.log(`Environment: ${isDevelopment ? 'Development' : 'Production'}`);
  console.log(`ServiceM8 API Key: ${hasServiceM8Key ? 'Set' : 'Not set (will use mock data)'}`);
  console.log(`Customer UUID: ${hasCustomerUuid ? 'Set' : 'Not set (will use default)'}`);
  console.log('');
  
  // Summary
  console.log('📊 Summary:\n');
  
  if (allRequired) {
    console.log('✅ All required environment variables are set!');
  } else {
    console.log('❌ Some required environment variables are missing.');
    console.log('   Please set the missing variables in your .env.local file.');
  }
  
  if (!hasServiceM8Key && isDevelopment) {
    console.log('ℹ️  ServiceM8 API key not set - application will use mock data');
  }
  
  if (!hasCustomerUuid && isDevelopment) {
    console.log('ℹ️  Customer UUID not set - will use default "company-123"');
  }
  
  console.log('');
  
  if (allRequired) {
    console.log('🚀 Environment is ready! You can now run:');
    console.log('   npm run dev');
    console.log('');
    console.log('📚 For more setup information, see docs/SETUP.md');
    return true;
  } else {
    console.log('🔧 Please fix the missing environment variables and run this check again.');
    return false;
  }
};

// Run the check
if (require.main === module) {
  const success = checkEnvironment();
  process.exit(success ? 0 : 1);
}

export { checkEnvironment };
