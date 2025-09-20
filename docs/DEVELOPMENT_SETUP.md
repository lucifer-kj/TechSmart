# ServiceM8 Customer Portal - Development Setup

This guide will help you set up the ServiceM8 Customer Portal for development with mock data, so you can work on the UI and functionality without requiring a full ServiceM8 and Supabase setup.

## Quick Start (Development Mode)

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Development Environment
```bash
npm run setup-dev
```

This script will:
- Create a `.env` file if it doesn't exist
- Add `DEV_BYPASS_AUTH=true` to enable development mode
- Set up mock data configuration

### 3. Start Development Server
```bash
npm run dev
```

### 4. Access the Admin Portal
Navigate to: http://localhost:3000/admin

In development mode, you'll see:
- ✅ Mock user data in the Users section
- ✅ Mock quote data in the Quotes section  
- ✅ Mock document data in the Documents section
- ✅ Authentication bypass (no login required)

## Development Mode Features

### Authentication Bypass
When `DEV_BYPASS_AUTH=true` is set in your `.env` file:
- All admin API endpoints return mock data
- No authentication is required
- Perfect for UI development and testing

### Mock Data Available
- **Users**: 4 sample users (1 admin, 3 customers) with realistic data
- **Quotes**: 2 sample quotes with PDF attachments
- **Documents**: 4 sample documents including quotes, invoices, materials, and photos
- **Jobs**: 8 sample jobs with various statuses and realistic details

### ServiceM8 API Integration
The following ServiceM8 APIs are properly integrated:
- ✅ `attachment.json` - For fetching document attachments
- ✅ `jobmaterial.json` - For fetching job materials as documents
- ✅ Both APIs work together to provide comprehensive document management

## Environment Variables

### Required for Development
```env
NODE_ENV=development
DEV_BYPASS_AUTH=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Required for Production
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ServiceM8 API Configuration
SERVICEM8_API_KEY=your_servicem8_api_key
SERVICEM8_WEBHOOK_SECRET=your_webhook_secret

# Set to false for production
DEV_BYPASS_AUTH=false
```

## API Endpoints

### Admin APIs (All support development mode with mock data)

#### Users API
- **Endpoint**: `/api/admin/users`
- **Filters**: `role`, `status`, `search`
- **Mock Data**: 4 users with different roles and statuses

#### Quotes API  
- **Endpoint**: `/api/admin/quotes`
- **Filters**: `status`, `customer`, `fileType`, `sync`
- **ServiceM8 Integration**: Uses `attachment.json` API
- **Mock Data**: 2 quote documents

#### Documents API
- **Endpoint**: `/api/admin/documents`
- **Filters**: `documentType`, `customer`, `customerId`, `jobId`, `sync`
- **ServiceM8 Integration**: Uses both `attachment.json` and `jobmaterial.json` APIs
- **Mock Data**: 4 documents of various types

## Development Workflow

### 1. UI Development
Work on components and pages using the mock data. All admin pages will load with realistic sample data.

### 2. API Testing
Test API filtering and search functionality with the mock data endpoints.

### 3. ServiceM8 Integration Testing
When ready to test with real ServiceM8 data:
1. Add your `SERVICEM8_API_KEY` to `.env`
2. Set `DEV_BYPASS_AUTH=false`
3. Configure Supabase credentials
4. Use the sync endpoints to pull real data

### 4. Database Testing
Run the seeding scripts to populate your database with test data:
```bash
npm run seed
```

## Troubleshooting

### Admin Portal Shows 401 Errors
Make sure `DEV_BYPASS_AUTH=true` is set in your `.env` file.

### No Mock Data Showing
Check that `NODE_ENV=development` and `DEV_BYPASS_AUTH=true` are both set.

### ServiceM8 API Errors in Production
Verify your `SERVICEM8_API_KEY` is valid and has the necessary permissions.

## Production Deployment

Before deploying to production:

1. Set up Supabase project and configure environment variables
2. Set `DEV_BYPASS_AUTH=false`
3. Configure ServiceM8 API key
4. Run database migrations
5. Test authentication flow

## Available Scripts

- `npm run setup-dev` - Setup development environment
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run seed` - Seed database with test data
- `npm run test` - Run tests

## Next Steps

Once you have the development environment running:

1. Explore the admin portal at http://localhost:3000/admin
2. Test the filtering and search functionality
3. Review the mock data to understand the data structure
4. Start building your custom features

The development setup provides a complete working environment that mimics production behavior while using mock data, making it perfect for rapid development and testing.
