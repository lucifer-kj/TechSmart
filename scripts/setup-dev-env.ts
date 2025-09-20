#!/usr/bin/env ts-node

import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Setup development environment for ServiceM8 Customer Portal
 * This script ensures the .env file has the necessary development configuration
 */

const envPath = join(process.cwd(), '.env');
const envExamplePath = join(process.cwd(), 'env.example');

console.log('🚀 Setting up development environment...');

// Check if .env exists
if (!existsSync(envPath)) {
  if (existsSync(envExamplePath)) {
    console.log('📋 Copying env.example to .env...');
    const envExample = readFileSync(envExamplePath, 'utf8');
    writeFileSync(envPath, envExample);
    console.log('✅ Created .env file from env.example');
  } else {
    console.log('❌ No env.example file found. Creating minimal .env...');
    const minimalEnv = `# Development Configuration
NODE_ENV=development
DEV_BYPASS_AUTH=true

# Supabase Configuration (required for production)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ServiceM8 API Configuration (optional for development)
SERVICEM8_API_KEY=your_servicem8_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
`;
    writeFileSync(envPath, minimalEnv);
    console.log('✅ Created minimal .env file');
  }
} else {
  console.log('📋 .env file already exists. Checking for DEV_BYPASS_AUTH...');
  
  const envContent = readFileSync(envPath, 'utf8');
  
  if (!envContent.includes('DEV_BYPASS_AUTH')) {
    console.log('➕ Adding DEV_BYPASS_AUTH to existing .env...');
    const updatedContent = envContent + '\n# Development Configuration\nDEV_BYPASS_AUTH=true\n';
    writeFileSync(envPath, updatedContent);
    console.log('✅ Added DEV_BYPASS_AUTH to .env');
  } else {
    console.log('✅ DEV_BYPASS_AUTH already configured');
  }
}

console.log('\n🎉 Development environment setup complete!');
console.log('\n📝 Next steps:');
console.log('1. Run: npm run dev');
console.log('2. Visit: http://localhost:3000/admin');
console.log('3. The admin portal will work with mock data in development mode');
console.log('\n💡 For production setup:');
console.log('- Configure Supabase environment variables');
console.log('- Add ServiceM8 API key');
console.log('- Set DEV_BYPASS_AUTH=false');
