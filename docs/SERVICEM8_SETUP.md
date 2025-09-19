# ServiceM8 Integration Setup Guide

This guide explains how to configure the app to work with any ServiceM8 account by simply providing an API key.

## 🚀 Quick Start

The app now automatically detects your ServiceM8 company information from your API key. You only need to provide one environment variable:

```bash
SERVICEM8_API_KEY=your_servicem8_api_key
```

## 📋 Prerequisites

1. **ServiceM8 Account**: You need an active ServiceM8 account
2. **API Key**: Generate an API key from your ServiceM8 account settings
3. **Supabase Project**: Set up a Supabase project for the portal

## 🔑 Getting Your ServiceM8 API Key

1. Log into your ServiceM8 account
2. Go to **Settings** → **API Keys**
3. Click **Create New API Key**
4. Give it a descriptive name (e.g., "Customer Portal")
5. Copy the generated API key

## ⚙️ Environment Configuration

### Required Variables

```bash
# ServiceM8 API Configuration
SERVICEM8_API_KEY=your_servicem8_api_key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Optional Variables

```bash
# ServiceM8 Webhook (for production)
SERVICEM8_WEBHOOK_SECRET=your_webhook_secret

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=noreply@yourdomain.com
```

## 🔄 How It Works

### Automatic Company Detection

When you provide a `SERVICEM8_API_KEY`, the app:

1. **Fetches Company Info**: Automatically retrieves your company details from ServiceM8
2. **Caches Configuration**: Stores the configuration for 24 hours to improve performance
3. **Handles Multiple Companies**: If you have multiple companies, it uses the first one
4. **Fallback Support**: Falls back to mock data if the API is unavailable

### Dynamic Configuration

The app dynamically configures itself based on your ServiceM8 account:

- **Company UUID**: Automatically detected from your API key
- **Company Name**: Used in the portal interface
- **Base URL**: ServiceM8 API endpoint (configurable for different regions)
- **Customer Data**: Fetched from your ServiceM8 account

## 🧪 Testing Your Setup

### 1. Validate API Key

You can test your API key using the built-in validation endpoint:

```bash
curl -X POST http://localhost:3000/api/servicem8/config \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "your_api_key"}'
```

### 2. Check Configuration

View your ServiceM8 configuration:

```bash
curl http://localhost:3000/api/servicem8/config
```

### 3. Test Data Fetching

The app will automatically use your ServiceM8 data when the API key is configured. If no API key is provided, it falls back to mock data for development.

## 🔧 Advanced Configuration

### Custom Base URL

If you're using a custom ServiceM8 instance or different region, you can override the base URL:

```typescript
// In your environment or configuration
SERVICEM8_BASE_URL=https://custom-api.servicem8.com/api_1.0
```

### Multiple Companies

If your ServiceM8 account has multiple companies, the app will use the first one by default. To specify a different company, you can:

1. **Use Query Parameters**: `?customerId=your-company-uuid`
2. **Override in Code**: Modify the configuration service

### Caching

The app caches ServiceM8 configuration for 24 hours. To clear the cache:

```typescript
import { clearServiceM8ConfigCache } from '@/lib/servicem8-config';

// Clear cache for specific API key
clearServiceM8ConfigCache('your_api_key');

// Clear all cached configurations
clearServiceM8ConfigCache();
```

## 🚨 Troubleshooting

### Common Issues

#### 1. "No companies found in ServiceM8 account"
- **Cause**: Your ServiceM8 account doesn't have any companies set up
- **Solution**: Create a company in ServiceM8 first

#### 2. "Invalid API key"
- **Cause**: The API key is incorrect or expired
- **Solution**: Generate a new API key in ServiceM8

#### 3. "Rate limit exceeded"
- **Cause**: Too many API requests
- **Solution**: The app automatically handles rate limiting with exponential backoff

#### 4. "ServiceM8 API Error 401"
- **Cause**: Unauthorized access
- **Solution**: Check that your API key has the correct permissions

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
NODE_ENV=development
DEBUG=servicem8:*
```

### Fallback Behavior

If ServiceM8 API is unavailable, the app will:

1. **Use Mock Data**: Provide sample data for development
2. **Show Error Messages**: Inform users about the issue
3. **Continue Functioning**: Allow basic portal operations

## 🔒 Security Considerations

### API Key Security

- **Never commit API keys** to version control
- **Use environment variables** for all sensitive data
- **Rotate API keys** regularly
- **Use least privilege** - only grant necessary permissions

### Data Access

- **Customer Isolation**: Each customer only sees their own data
- **Admin Override**: Admins can access all customer data
- **Audit Logging**: All data access is logged for security

## 📊 Monitoring

### Health Checks

Monitor your ServiceM8 integration:

```bash
# Check API connectivity
curl http://localhost:3000/api/servicem8/config

# Check data sync status
curl http://localhost:3000/api/servicem8/health
```

### Logs

The app logs all ServiceM8 API interactions:

- **Success**: Normal API calls
- **Errors**: Failed API calls with retry attempts
- **Rate Limiting**: Automatic backoff and retry
- **Cache Hits**: Performance optimization

## 🚀 Production Deployment

### Environment Variables

Set these in your production environment:

```bash
SERVICEM8_API_KEY=your_production_api_key
SERVICEM8_WEBHOOK_SECRET=your_webhook_secret
NODE_ENV=production
```

### Webhook Configuration

Configure ServiceM8 webhooks to point to your production URL:

```
https://your-domain.com/api/webhooks/servicem8
```

### Performance Optimization

- **Enable Caching**: ServiceM8 configuration is cached for 24 hours
- **Rate Limiting**: Built-in rate limiting prevents API abuse
- **Error Handling**: Graceful fallbacks ensure uptime

## 📞 Support

If you encounter issues:

1. **Check the logs** for error messages
2. **Validate your API key** using the test endpoint
3. **Verify ServiceM8 permissions** for your API key
4. **Check network connectivity** to ServiceM8 API

For additional help, refer to the [ServiceM8 API Documentation](https://developer.servicem8.com/) or contact support.
