# Quick Start Guide

## Prerequisites

✅ Backend running on http://localhost:3000
✅ Supabase project set up
✅ Node.js 18+ installed

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd pos-frontend
npm install
```

### 2. Configure Environment

Create/Update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

Get these from your Supabase project:
- Go to Project Settings → API
- Copy Project URL → NEXT_PUBLIC_SUPABASE_URL
- Copy anon public key → NEXT_PUBLIC_SUPABASE_ANON_KEY

### 3. Start Development Server

```bash
npm run dev
```

Access at: **http://localhost:3001**

### 4. First Login

1. Create a user in Supabase Dashboard (Authentication → Users)
2. Note the User UID
3. Create user mapping in backend:
   ```bash
   curl -X POST http://localhost:3000/api/v1/users \
     -H "Content-Type: application/json" \
     -d '{
       "tenantId": "your-tenant-id",
       "supabaseUserId": "user-uid-from-supabase",
       "email": "user@example.com",
       "name": "John Doe",
       "role": "OWNER"
     }'
   ```
4. Login using the email/password from Supabase

## Pages Available

- `/login` - Login page
- `/dashboard` - Main dashboard
- `/items` - Items management
- `/pos` - POS billing
- `/kot` - Kitchen orders
- `/inventory` - Inventory tracking
- `/reports` - Reports and analytics
- `/users` - User management

## Troubleshooting

### Backend Connection Error
- Ensure backend is running on port 3000
- Check NEXT_PUBLIC_API_URL in .env.local

### Supabase Auth Error
- Verify Supabase URL and Anon Key
- Check Supabase project is active
- Ensure user exists in both Supabase AND backend

### Port Conflict
The frontend runs on port 3001 by default (backend uses 3000)

## Next Steps

1. ✅ Create categories (Beverages, Food, etc.)
2. ✅ Add items to categories
3. ✅ Create purchase orders to add inventory
4. ✅ Test billing flow
5. ✅ Check reports

Happy coding! 🚀
