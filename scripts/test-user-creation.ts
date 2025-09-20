#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testUserCreationFlow() {
  console.log('🧪 Testing User Creation Flow\n');

  try {
    // Test 1: Create a new customer and user access
    console.log('📝 Test 1: Creating new customer with user access...');
    
    const newCustomerData = {
      name: `Test Customer ${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      phone: '+61400000000',
      address: '123 Test Street, Test City, NSW 2000'
    };

    // Create customer via API
    const customerResponse = await fetch('http://localhost:3000/api/admin/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-admin-token' // This would be a real token in production
      },
      body: JSON.stringify({
        ...newCustomerData,
        createPortalAccess: true,
        generateCredentials: true
      })
    });

    if (customerResponse.ok) {
      const customerResult = await customerResponse.json();
      console.log('✅ New customer created:', {
        id: customerResult.customer.id,
        name: customerResult.customer.name,
        email: customerResult.customer.email,
        tempPassword: customerResult.customer.tempPassword ? '[GENERATED]' : 'None'
      });

      // Verify user profile was created
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('customer_id', customerResult.customer.id)
        .single();

      if (userProfile) {
        console.log('✅ User profile created:', {
          id: userProfile.id,
          email: userProfile.email,
          role: userProfile.role,
          is_active: userProfile.is_active
        });
      } else {
        console.log('❌ User profile not found');
      }
    } else {
      console.log('❌ Failed to create customer:', await customerResponse.text());
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 2: Create user access for existing customer
    console.log('📝 Test 2: Creating user access for existing customer...');
    
    // First, create a customer without user access
    const existingCustomerData = {
      name: `Existing Customer ${Date.now()}`,
      email: `existing-${Date.now()}@example.com`,
      phone: '+61400000001',
      createPortalAccess: false
    };

    const existingCustomerResponse = await fetch('http://localhost:3000/api/admin/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-admin-token'
      },
      body: JSON.stringify(existingCustomerData)
    });

    if (existingCustomerResponse.ok) {
      const existingCustomerResult = await existingCustomerResponse.json();
      console.log('✅ Existing customer created (no access):', {
        id: existingCustomerResult.customer.id,
        name: existingCustomerResult.customer.name,
        email: existingCustomerResult.customer.email
      });

      // Now create portal access for this customer
      const portalAccessResponse = await fetch(`http://localhost:3000/api/admin/customers/${existingCustomerResult.customer.id}/portal-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-admin-token'
        },
        body: JSON.stringify({
          createPortalAccess: true,
          generateCredentials: true
        })
      });

      if (portalAccessResponse.ok) {
        const portalAccessResult = await portalAccessResponse.json();
        console.log('✅ Portal access created:', {
          message: portalAccessResult.message,
          tempPassword: portalAccessResult.tempPassword ? '[GENERATED]' : 'None'
        });

        // Verify user profile was created
        const { data: newUserProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('customer_id', existingCustomerResult.customer.id)
          .single();

        if (newUserProfile) {
          console.log('✅ User profile created for existing customer:', {
            id: newUserProfile.id,
            email: newUserProfile.email,
            role: newUserProfile.role,
            is_active: newUserProfile.is_active
          });
        } else {
          console.log('❌ User profile not found for existing customer');
        }
      } else {
        console.log('❌ Failed to create portal access:', await portalAccessResponse.text());
      }
    } else {
      console.log('❌ Failed to create existing customer:', await existingCustomerResponse.text());
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 3: Verify data fetching for user
    console.log('📝 Test 3: Testing user-specific data fetching...');
    
    // Get a customer with user access
    const { data: testCustomer } = await supabase
      .from('customers')
      .select('id, name')
      .limit(1)
      .single();

    if (testCustomer) {
      const dataResponse = await fetch(`http://localhost:3000/api/admin/customers/${testCustomer.id}/jobs`, {
        headers: {
          'Authorization': 'Bearer test-admin-token'
        }
      });

      if (dataResponse.ok) {
        const dataResult = await dataResponse.json();
        console.log('✅ User data fetched successfully:', {
          customer: testCustomer.name,
          jobs: dataResult.jobs?.length || 0,
          documents: dataResult.documents?.length || 0,
          quotes: dataResult.quotes?.length || 0,
          payments: dataResult.payments?.length || 0
        });
      } else {
        console.log('❌ Failed to fetch user data:', await dataResponse.text());
      }
    } else {
      console.log('⚠️ No customers found for data fetching test');
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

async function testDatabaseIntegrity() {
  console.log('\n🔍 Testing Database Integrity...\n');

  try {
    // Check if all required tables exist
    const tables = ['customers', 'user_profiles', 'jobs', 'documents', 'quotes', 'payments', 'audit_logs'];
    
    for (const table of tables) {
      try {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        console.log(`✅ Table '${table}': ${count || 0} records`);
      } catch (error) {
        console.log(`❌ Table '${table}': Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Test RLS policies
    console.log('\n🔒 Testing Row Level Security...');
    
    // This would require actual user sessions to test properly
    console.log('⚠️ RLS testing requires authenticated user sessions - skipping for now');

  } catch (error) {
    console.error('❌ Database integrity test error:', error);
  }
}

async function main() {
  console.log('🚀 ServiceM8 Customer Portal - User Creation Tests\n');
  
  await testDatabaseIntegrity();
  await testUserCreationFlow();
  
  console.log('\n✅ All tests completed!');
}

if (require.main === module) {
  main().catch(console.error);
}
