# Universal SaaS POS Backend - Setup Guide

## Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js**: v18.x or later
- **npm** or **yarn**: Latest version
- **PostgreSQL**: v14 or later (or Supabase account)
- **Redis**: v7.x or later (or Upstash account)
- **Git**: For version control

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Navigate to project directory
cd SaaS_Platform_POS

# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and configure the following:

#### Database Configuration (Supabase)

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"
```

To get your Supabase database URL:
1. Go to https://supabase.com
2. Create a new project (or use existing)
3. Go to Settings → Database
4. Copy the Connection String (URI format)
5. Replace `[YOUR-PASSWORD]` with your database password

#### Supabase Auth Configuration

```env
SUPABASE_URL="https://[YOUR-PROJECT].supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_JWT_SECRET="your-jwt-secret"
```

To get these values:
1. Go to Project Settings → API
2. Copy the `Project URL` → SUPABASE_URL
3. Copy the `anon public` key → SUPABASE_ANON_KEY
4. Copy the `JWT Secret` → SUPABASE_JWT_SECRET

#### Redis Configuration

**Option A: Local Redis**
```env
REDIS_URL="redis://localhost:6379"
```

**Option B: Upstash (Recommended for cloud)**
1. Go to https://upstash.com
2. Create a Redis database
3. Copy the Redis URL
```env
REDIS_URL="rediss://default:[PASSWORD]@[HOST]:[PORT]"
```

#### Application Configuration

```env
NODE_ENV="development"
PORT=3000
API_PREFIX="api/v1"

JWT_SECRET="your-secure-jwt-secret-min-32-chars"
JWT_EXPIRATION="7d"

CORS_ORIGIN="http://localhost:3000,http://localhost:5173"
```

### 3. Database Setup

#### Generate Prisma Client

```bash
npm run prisma:generate
```

#### Run Migrations

```bash
# Create and apply migrations
npm run prisma:migrate
```

This will:
- Create all database tables
- Set up relationships
- Apply indexes

#### Verify Database

```bash
# Open Prisma Studio to verify
npm run prisma:studio
```

Access Prisma Studio at http://localhost:5555

## Running the Application

### Development Mode

```bash
npm run start:dev
```

The API will be available at:
- **API**: http://localhost:3000/api/v1
- **Swagger Documentation**: http://localhost:3000/api/docs

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

## Testing the Setup

### 1. Check API Health

```bash
curl http://localhost:3000/api/v1/auth/health
```

Expected response:
```json
{
  "success": true,
  "message": "Auth service is healthy"
}
```

### 2. Create a Tenant

```bash
curl -X POST http://localhost:3000/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Hotel",
    "businessType": "HOTEL",
    "email": "admin@testhotel.com",
    "phone": "+919876543210"
  }'
```

Save the returned `tenant.id` for next steps.

### 3. Create a User in Supabase

1. Go to Supabase Dashboard → Authentication → Users
2. Create a new user with email/password
3. Note the User UID

### 4. Map Supabase User to Internal User

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "your-tenant-id",
    "supabaseUserId": "supabase-user-uid",
    "email": "user@testhotel.com",
    "name": "John Doe",
    "role": "OWNER"
  }'
```

### 5. Login and Get JWT Token

Use Supabase client or Auth API to login and get JWT token.

Example using Supabase JS client:
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@testhotel.com',
  password: 'your-password'
})

const token = data.session.access_token
```

### 6. Test Authenticated Endpoint

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Setting Up Sample Data

### 1. Create Categories

```bash
curl -X POST http://localhost:3000/api/v1/categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Beverages",
    "description": "Hot and cold drinks"
  }'
```

### 2. Create Items

```bash
curl -X POST http://localhost:3000/api/v1/items \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": "category-id",
    "name": "Cappuccino",
    "price": 150,
    "gstRate": 5,
    "trackInventory": true,
    "unit": "PCS"
  }'
```

### 3. Create a Purchase Order

```bash
curl -X POST http://localhost:3000/api/v1/purchases \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "supplierName": "ABC Suppliers",
    "items": [
      {
        "itemId": "item-id",
        "quantity": 100,
        "costPrice": 50
      }
    ]
  }'
```

### 4. Receive Purchase (Creates Inventory)

```bash
curl -X POST http://localhost:3000/api/v1/purchases/{purchase-id}/receive \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 5. Create a Bill

```bash
curl -X POST http://localhost:3000/api/v1/billing \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "itemId": "item-id",
        "quantity": 2
      }
    ],
    "paymentMethod": "CASH",
    "customerName": "Walk-in Customer"
  }'
```

## Common Issues and Solutions

### Issue: "Database connection failed"

**Solution:**
- Verify DATABASE_URL is correct
- Check if Supabase project is running
- Ensure your IP is allowed in Supabase settings
- Test connection: `npx prisma db pull`

### Issue: "JWT verification failed"

**Solution:**
- Verify SUPABASE_JWT_SECRET matches Supabase project
- Ensure token is not expired
- Check if user exists in users table

### Issue: "Redis connection error"

**Solution:**
- If using local Redis, ensure it's running: `redis-cli ping`
- If using Upstash, verify URL format includes password
- Redis is optional - caching will be disabled if unavailable

### Issue: "Insufficient inventory"

**Solution:**
- Create a purchase order first
- Receive the purchase to create inventory batches
- Verify item has `trackInventory: true`

### Issue: "Tenant isolation not working"

**Solution:**
- Ensure JWT token has valid user with tenantId
- Check PrismaService middleware is active
- Verify all queries include tenantId

## Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT_SECRET (min 32 characters)
- [ ] Configure production DATABASE_URL
- [ ] Set up production Redis (Upstash recommended)
- [ ] Enable HTTPS
- [ ] Configure proper CORS_ORIGIN
- [ ] Set up database backups
- [ ] Configure logging and monitoring
- [ ] Set up rate limiting
- [ ] Review and update Prisma connection pool settings
- [ ] Enable database SSL if required

## Architecture Overview

```
Frontend (React/Next.js)
    ↓
Supabase Auth (JWT)
    ↓
NestJS Backend (this repo)
    ↓
PostgreSQL (Supabase) + Redis + Prisma ORM
```

## Key Features Implemented

✅ Multi-tenant architecture
✅ Supabase JWT authentication
✅ Role-based access control (OWNER, MANAGER, CASHIER, KITCHEN)
✅ Items & Categories management
✅ Batch-based inventory (FIFO/Weighted Average)
✅ Purchase orders with inventory creation
✅ Transactional billing engine
✅ Kitchen Order Tickets (KOT)
✅ Print job queue
✅ Comprehensive audit logs
✅ Sales and inventory reports
✅ Redis caching layer

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:3000/api/docs

All endpoints, request/response schemas, and examples are documented there.

## Support

For issues:
1. Check logs: Application logs will show detailed error information
2. Verify environment configuration
3. Test database connectivity
4. Check Prisma Studio for data verification

## Next Steps

After successful setup:
1. Implement frontend application
2. Set up print agent for physical printers
3. Configure automated backups
4. Set up monitoring and alerting
5. Implement SSL certificates for production
6. Configure CI/CD pipeline
