# **Precise Application Requirements for Admin Portal with ServiceM8 Integration**  

## **1. Core Objectives**  
Build an **Admin Portal** with:  
- **User & Client Management** (via Supabase + ServiceM8)  
- **Authentication** (Email/Password + Magic Links)  
- **Data Isolation** (Users see only their assigned jobs/documents)  
- **Approvals & Feedback** (Direct sync to ServiceM8)  

---

## **2. Admin Portal Features**  

### **A. User Management**  
- **Create Users**  
  - Admin generates credentials (email + random password) or magic link.  
  - User is added to:  
    - **Supabase `auth.users` table** (for authentication)  
    - **ServiceM8** (as a client if not existing)  
- **Ban/Unban Users**  
  - Toggle `is_active` flag in Supabase to restrict access.  
- **Reset User Passwords**  
  - Admin can trigger a password reset link.  

### **B. Dashboard & Analytics**  
- **Real-time Stats Display** (Cards/Graphs):  
  - Total Users (Active/Banned)  
  - Total Clients (from ServiceM8)  
  - Total Documents Uploaded  
  - Pending Approvals  
  - Recent User Activity Log  

### **C. ServiceM8 Sync**  
- **Automatic Client Sync**  
  - New users in the portal must be linked to ServiceM8 clients via **UUID**.  
- **Manual Sync Option**  
  - Admin can force-refresh client/job data from ServiceM8.  

---

## **3. User Portal Features**  

### **A. Authentication**  
- **Login Methods:**  
  - Email + Password (admin-generated)  
  - Magic Link (via Supabase Auth)  
- **Password Reset**  
  - Self-service via "Forgot Password" flow.  

### **B. Restricted Data Access**  
- Users **only** see:  
  - Jobs linked to their **UUID** (filtered from ServiceM8).  
  - Documents associated with their jobs.  

### **C. Actions on Jobs**  
- **Submit Quote Approvals**  
  - Sent directly to ServiceM8 via API.  
- **Provide Feedback**  
  - Stored in Supabase & pushed to ServiceM8.  

---

## **4. Technical Implementation**  

### **A. Database (Supabase)**  
```sql  
-- Extend auth.users for portal-specific data  
CREATE TABLE user_profiles (  
  id UUID REFERENCES auth.users PRIMARY KEY,  
  service_m8_client_id TEXT NOT NULL,  
  is_active BOOLEAN DEFAULT TRUE,  
  last_login TIMESTAMPTZ  
);  

-- Track approvals/feedback  
CREATE TABLE approvals (  
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
  user_id UUID REFERENCES user_profiles(id) NOT NULL,  
  service_m8_job_id TEXT NOT NULL,  
  status TEXT CHECK (status IN ('approved', 'rejected', 'pending')),  
  feedback TEXT,  
  synced_to_service_m8 BOOLEAN DEFAULT FALSE  
);  
```  

### **B. API Endpoints**  
| Role       | Endpoint                     | Action                          |  
|------------|------------------------------|---------------------------------|  
| **Admin**  | `POST /admin/users`          | Create user (Supabase + ServiceM8) |  
|            | `PATCH /admin/users/:id`     | Ban/Unban user                  |  
|            | `GET /admin/stats`           | Fetch dashboard metrics         |  
| **User**   | `GET /user/jobs`             | List jobs (UUID-filtered)       |  
|            | `POST /user/approvals`       | Submit approval to ServiceM8    |  

### **C. Security Rules**  
- **Row-Level Security (RLS)** in Supabase:  
  ```sql  
  -- Users can only access their own data  
  CREATE POLICY user_data_isolation ON approvals  
  FOR SELECT USING (user_id = auth.uid());  
  ```  
- **Admin-only routes** protected by JWT role claims.  

---

## **5. Flow Diagrams**  

### **User Creation Flow**  
1. Admin enters email → generates password/magic link.  
2. System:  
   - Creates user in Supabase `auth.users`.  
   - Links to ServiceM8 client (or creates new client).  
3. Email sent with credentials/link.  

### **Approval Submission Flow**  
1. User submits approval in portal.  
2. System:  
   - Stores in `approvals` table.  
   - Pushes to ServiceM8 via API.  
   - Marks `synced_to_service_m8 = TRUE`.  

---