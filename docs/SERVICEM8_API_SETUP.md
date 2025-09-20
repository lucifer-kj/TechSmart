# ServiceM8 API Setup Guide

## Issue: Not Fetching Clients from ServiceM8

The admin customers page is currently showing "No customers found" because the ServiceM8 API is not configured. Here's how to fix it:

## 🔧 Quick Setup

### 1. **Get Your ServiceM8 API Key**
- Visit: https://developer.servicem8.com/
- Log in to your ServiceM8 account
- Generate an API key with appropriate permissions

### 2. **Configure Environment Variables**
Create a `.env.local` file in your project root:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# ServiceM8 API Configuration (Required)
SERVICEM8_API_KEY=your_servicem8_api_key_here

# Optional
SERVICEM8_CUSTOMER_UUID=your_default_customer_uuid
```

### 3. **Restart Development Server**
```bash
npm run dev
```

## 🔍 How It Works

### **Without ServiceM8 API Key:**
- ⚠️ Shows "ServiceM8 API key not configured"
- 📊 Only displays customers from local Supabase database
- 🔄 No real-time ServiceM8 data

### **With ServiceM8 API Key:**
- ✅ Automatically fetches clients from ServiceM8
- 🔄 Syncs with local database when `?sync=true` is used
- 📊 Shows live ServiceM8 data including client details
- 🎯 Full ServiceM8 integration

## 🧪 Testing

### **Test API Directly:**
```bash
# Check API status
curl http://localhost:3000/api/admin/customers

# Force sync with ServiceM8
curl http://localhost:3000/api/admin/customers?sync=true
```

### **Check Console Logs:**
Look for these messages in your terminal:
- ✅ `ServiceM8 API key found - fetching from ServiceM8`
- 📡 `Fetching clients from ServiceM8 (limit: 50, offset: 0)`
- ✅ `Retrieved X clients from ServiceM8`

### **Or Warning Messages:**
- ⚠️ `ServiceM8 API key not configured - using local data only`
- ❌ `ServiceM8 API error: [error details]`

## 📊 API Response Format

### **With ServiceM8:**
```json
{
  "customers": [
    {
      "id": "local-uuid",
      "servicem8_customer_uuid": "sm8-uuid",
      "name": "Customer Name",
      "email": "email@example.com",
      "servicem8_data": {
        "uuid": "sm8-uuid",
        "name": "Customer Name",
        "email": "email@example.com",
        "mobile": "+61 123 456 789",
        "active": 1
      }
    }
  ],
  "servicem8_status": {
    "available": true,
    "error": null,
    "synced": true
  }
}
```

### **Without ServiceM8:**
```json
{
  "customers": [],
  "servicem8_status": {
    "available": false,
    "error": "ServiceM8 API key not configured",
    "synced": false
  }
}
```

## 🚀 Usage

### **Admin Customers Page:**
- Visit: `http://localhost:3000/admin/customers`
- **Auto-fetch**: Automatically gets ServiceM8 clients when API key is configured
- **Manual Sync**: Click refresh or add `?sync=true` to URL
- **Real-time Data**: Shows live ServiceM8 client information

### **API Endpoints:**
- `GET /api/admin/customers` - List customers (auto-fetches from ServiceM8)
- `GET /api/admin/customers?sync=true` - Force sync with ServiceM8
- `GET /api/admin/customers?status=active` - Filter by status
- `POST /api/admin/customers` - Create new customer (creates in ServiceM8 first)

## 🔧 Troubleshooting

### **"No customers found"**
1. ✅ Check `.env.local` exists with `SERVICEM8_API_KEY`
2. 🔄 Restart development server
3. 📡 Check console logs for ServiceM8 connection messages
4. 🧪 Test API directly with curl

### **ServiceM8 API Errors**
1. 🔑 Verify API key is valid
2. 📊 Check ServiceM8 account has clients
3. 🔐 Ensure API key has necessary permissions
4. 🌐 Check network connectivity

### **Development Mode**
- Without API key: Uses mock data and local database only
- With API key: Full ServiceM8 integration with real-time data

## 💡 Tips

1. **Always use `?sync=true`** for the first load to populate local database
2. **Check console logs** to see what's happening with ServiceM8 API
3. **API automatically fetches** from ServiceM8 when key is available
4. **Graceful fallback** to local data if ServiceM8 is unavailable

Once you configure the ServiceM8 API key, you should see all your ServiceM8 clients in the admin customers page!
