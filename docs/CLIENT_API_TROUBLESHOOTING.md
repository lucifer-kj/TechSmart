# Client API Troubleshooting Guide

This guide helps resolve issues with fetching client details from the API.

## Common Issues and Solutions

### 1. Authentication Issues

**Problem**: `getAuthUser()` returns `null`, causing 401 errors

**Symptoms**:
- Dashboard shows "You must be signed in to view jobs"
- API calls to `/api/customer-portal/*` return 401
- Console shows "Auth failed" messages

**Solutions**:
```bash
# 1. Check if user is properly authenticated
# Visit /login and sign in with magic link

# 2. Run the development setup fix
npm run fix-dev-setup

# 3. Check environment variables
npm run check-env
```

### 2. Missing User Profiles

**Problem**: User exists in Supabase Auth but not in `user_profiles` table

**Symptoms**:
- "Customer profile not found" error (404)
- User can log in but can't access dashboard
- Console shows "Profile lookup failed"

**Solutions**:
```bash
# Automatically fix missing profiles
npm run fix-dev-setup
```

**Manual Fix**:
```sql
-- Create missing user profile
INSERT INTO user_profiles (id, email, full_name, role, is_active)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email), 'customer', true
FROM auth.users 
WHERE id NOT IN (SELECT id FROM user_profiles);
```

### 3. Missing Customer Mapping

**Problem**: User profile exists but no customer mapping

**Symptoms**:
- "Customer mapping not found" error (404)
- User has profile but no access to jobs/data
- Console shows "Customer lookup failed"

**Solutions**:
```bash
# Fix customer mappings
npm run fix-dev-setup
```

**Manual Fix**:
```sql
-- Link user to development customer
UPDATE user_profiles 
SET customer_id = (
  SELECT id FROM customers 
  WHERE servicem8_customer_uuid = 'company-123' 
  LIMIT 1
)
WHERE customer_id IS NULL AND role = 'customer';
```

### 4. Development Mode Setup

**Environment Variables Required**:
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional for ServiceM8 integration
SERVICEM8_API_KEY=your_api_key
SERVICEM8_CUSTOMER_UUID=company-123  # For development
```

**Development Mode Behavior**:
- If `SERVICEM8_API_KEY` is missing, app uses mock data
- If authentication fails, fallback to mock data
- All APIs have development mode bypasses

### 5. Database Migration Issues

**Problem**: Missing tables or outdated schema

**Solutions**:
```bash
# Check if all migrations are applied
supabase db diff

# Reset and reapply migrations
supabase db reset
```

## Quick Diagnostic Steps

1. **Check Authentication**:
   ```bash
   # Open browser console on dashboard
   # Look for auth-related errors
   ```

2. **Verify Database**:
   ```sql
   -- Check if user_profiles table exists
   SELECT COUNT(*) FROM user_profiles;
   
   -- Check if user has profile
   SELECT * FROM user_profiles WHERE email = 'your@email.com';
   
   -- Check customer mapping
   SELECT up.*, c.name, c.servicem8_customer_uuid 
   FROM user_profiles up 
   LEFT JOIN customers c ON c.id = up.customer_id 
   WHERE up.email = 'your@email.com';
   ```

3. **Test API Endpoints**:
   ```bash
   # Test jobs endpoint
   curl http://localhost:3000/api/customer-portal/jobs
   
   # Test dashboard endpoint  
   curl http://localhost:3000/api/customer-portal/dashboard
   ```

## Development Setup Commands

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your values

# 3. Run database migrations
supabase db reset

# 4. Fix development setup
npm run fix-dev-setup

# 5. Seed additional data (optional)
npm run seed

# 6. Start development server
npm run dev
```

## API Flow Diagram

```
Dashboard Request
├── /api/customer-portal/jobs
│   ├── getAuthUser() → Check auth
│   ├── Get user_profiles → Find customer_id  
│   ├── Get customers → Find servicem8_customer_uuid
│   ├── Fetch from ServiceM8 API or Mock Data
│   └── Return jobs data
│
└── /api/customer-portal/dashboard  
    ├── Similar auth flow
    └── Return dashboard stats
```

## Troubleshooting Checklist

- [ ] Environment variables set correctly
- [ ] Database migrations applied
- [ ] User authenticated (check /login)
- [ ] User profile exists in database
- [ ] Customer mapping exists
- [ ] ServiceM8 API key valid (if using real API)
- [ ] Development setup script run
- [ ] Browser console clear of errors

## Need Help?

If issues persist after following this guide:

1. Check the browser console for detailed error messages
2. Review server logs for API errors
3. Verify database state with SQL queries above
4. Run `npm run fix-dev-setup` again
5. Consider resetting the database with `supabase db reset`
