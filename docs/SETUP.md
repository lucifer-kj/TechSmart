# 🚀 ServiceM8 Customer Portal - Setup Guide

This guide will help you set up the ServiceM8 Customer Portal for development and production.

## 📋 Prerequisites

- Node.js 18+ and npm
- A Supabase account and project
- A ServiceM8 account with API access (optional for development)

## 🔧 Environment Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd servicem8
npm install
```

### 2. Create Environment File

Create a `.env.local` file in the root directory:

```bash
cp env.example .env.local
```

### 3. Configure Environment Variables

Edit `.env.local` with your actual values:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ServiceM8 API Configuration (Optional for development)
SERVICEM8_API_KEY=your_servicem8_api_key
SERVICEM8_CUSTOMER_UUID=company-123
SERVICEM8_WEBHOOK_SECRET=your_webhook_secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Security (Generate secure random strings)
JWT_SECRET=your_jwt_secret_key_32_chars_minimum
ENCRYPTION_KEY=your_32_character_encryption_key

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=noreply@yourdomain.com
```

## 🗄️ Database Setup

### 1. Run Database Migrations

```bash
# If using Supabase CLI
supabase db reset

# Or apply migrations manually in Supabase Dashboard
# Go to SQL Editor and run each migration file in order
```

### 2. Seed Development Data (Optional)

```bash
# Install tsx if not already installed
npm install -g tsx

# Run the seeding script
npx tsx scripts/seed-dev-data.ts
```

## 🔐 Authentication Setup

### 1. Supabase Auth Configuration

In your Supabase dashboard:

1. Go to **Authentication > Settings**
2. Configure **Site URL**: `http://localhost:3000` (development)
3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/callback?redirectTo=/dashboard`

### 2. Create Test Users (Development)

You can create users in two ways:

#### Option A: Magic Link (Recommended)
1. Go to `/login` in your app
2. Enter an email address
3. Check your email for the magic link
4. Click the link to sign in

#### Option B: Manual Creation
1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add User"
3. Create users with emails:
   - `admin@smarttech.com.au` (admin role)
   - `customer@smarttech.com.au` (customer role)

## 🚀 Running the Application

### Development Mode

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## 🧪 Testing the Setup

### 1. Verify Environment Variables

```bash
# Check if all required variables are set
npm run check-env
```

### 2. Test Database Connection

```bash
# Run the seeding script to test database connectivity
npx tsx scripts/seed-dev-data.ts
```

### 3. Test Authentication Flow

1. Navigate to `http://localhost:3000/login`
2. Enter your email address
3. Check for magic link email
4. Click the link to authenticate
5. Verify you can access the dashboard

## 🔧 Development Features

### Mock Data Mode

The application automatically falls back to mock data when:
- `SERVICEM8_API_KEY` is not set
- `NODE_ENV=development`
- Authentication fails

This allows you to develop and test without a ServiceM8 API key.

### Development Bypasses

Several development features are enabled when `NODE_ENV=development`:

- **Auth Fallback**: API routes fall back to mock data if authentication fails
- **Profile Creation**: Missing user profiles are automatically created
- **Enhanced Error Messages**: More detailed error information in console

## 🐛 Troubleshooting

### Common Issues

#### 1. "Unauthorized" Errors
- **Cause**: Missing or incorrect Supabase environment variables
- **Solution**: Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### 2. "Customer profile not found" Errors
- **Cause**: User exists in Supabase Auth but not in `user_profiles` table
- **Solution**: Run the seeding script or create profile manually

#### 3. Database Connection Errors
- **Cause**: Incorrect Supabase URL or service role key
- **Solution**: Verify `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

#### 4. Mock Data Not Loading
- **Cause**: ServiceM8 mock data function errors
- **Solution**: Check console for errors, ensure `SERVICEM8_CUSTOMER_UUID` is set

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
DEBUG=true
```

This will show detailed logs in the console.

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [ServiceM8 API Documentation](https://servicem8.com/api)
- [Next.js Documentation](https://nextjs.org/docs)

## 🆘 Getting Help

If you encounter issues:

1. Check the console for error messages
2. Verify all environment variables are set correctly
3. Ensure database migrations have been applied
4. Check Supabase project status and logs

For additional support, please refer to the project documentation or contact the development team.
