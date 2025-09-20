#!/usr/bin/env tsx
/**
 * Environment Setup Script
 * 
 * This script helps you set up your .env.local file with the correct configuration
 */

import * as fs from 'fs';
import * as path from 'path';

function setupEnvironment(): void {
  console.log('🔧 Environment Setup Tool\n');
  
  const rootDir = path.join(__dirname, '..');
  const envLocalPath = path.join(rootDir, '.env.local');
  const envExamplePath = path.join(rootDir, 'env.example');
  
  // Check if .env.local already exists
  if (fs.existsSync(envLocalPath)) {
    console.log('✅ .env.local file already exists');
    
    // Check if it has ServiceM8 API key
    const envContent = fs.readFileSync(envLocalPath, 'utf-8');
    if (envContent.includes('SERVICEM8_API_KEY=your_servicem8_api_key')) {
      console.log('⚠️ ServiceM8 API key is not configured (still has placeholder value)');
      console.log('\n📝 To fix this:');
      console.log('1. Open .env.local in your editor');
      console.log('2. Replace "your_servicem8_api_key" with your actual ServiceM8 API key');
      console.log('3. Your API key should start with "smk-"');
      console.log('4. Save the file and restart your development server');
    } else if (envContent.includes('SERVICEM8_API_KEY=')) {
      // Extract the API key value
      const match = envContent.match(/SERVICEM8_API_KEY=([^\n\r]+)/);
      if (match && match[1] && match[1] !== 'your_servicem8_api_key') {
        const apiKey = match[1].trim();
        console.log(`✅ ServiceM8 API key is configured: ${apiKey.substring(0, 8)}...`);
        
        if (!apiKey.startsWith('smk-')) {
          console.log('⚠️ Warning: API key should start with "smk-"');
        }
      } else {
        console.log('⚠️ ServiceM8 API key appears to be empty');
      }
    } else {
      console.log('❌ ServiceM8 API key is missing from .env.local');
      console.log('\n📝 Add this line to your .env.local file:');
      console.log('SERVICEM8_API_KEY=your_actual_api_key_here');
    }
  } else {
    console.log('❌ .env.local file does not exist');
    
    if (fs.existsSync(envExamplePath)) {
      console.log('📋 Creating .env.local from env.example...');
      
      try {
        fs.copyFileSync(envExamplePath, envLocalPath);
        console.log('✅ .env.local file created successfully');
        console.log('\n📝 Next steps:');
        console.log('1. Open .env.local in your editor');
        console.log('2. Replace all placeholder values with your actual configuration');
        console.log('3. Pay special attention to:');
        console.log('   - SERVICEM8_API_KEY (should start with "smk-")');
        console.log('   - NEXT_PUBLIC_SUPABASE_URL');
        console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
        console.log('   - SUPABASE_SERVICE_ROLE_KEY');
        console.log('4. Save the file and restart your development server');
      } catch (error) {
        console.error('❌ Failed to create .env.local:', error);
      }
    } else {
      console.log('❌ env.example file not found');
    }
  }
  
  console.log('\n🔍 Environment Variable Checklist:');
  console.log('□ SERVICEM8_API_KEY - Your ServiceM8 API key (starts with "smk-")');
  console.log('□ NEXT_PUBLIC_SUPABASE_URL - Your Supabase project URL');
  console.log('□ NEXT_PUBLIC_SUPABASE_ANON_KEY - Your Supabase anonymous key');
  console.log('□ SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key');
  
  console.log('\n📖 Where to find these values:');
  console.log('🔹 ServiceM8 API Key: https://my.servicem8.com/settings/api');
  console.log('🔹 Supabase Keys: https://app.supabase.com/project/YOUR_PROJECT/settings/api');
  
  console.log('\n🚀 After setup, run: npm run diagnose-servicem8');
}

// Run setup
setupEnvironment();
