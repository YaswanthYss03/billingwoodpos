# Universal SaaS POS Backend - Phase 1 MVP

A production-ready, multi-tenant SaaS Point of Sale system backend built with NestJS, PostgreSQL, and Prisma.

## Features (Phase 1)

- ✅ Multi-tenant architecture with hard tenant isolation
- ✅ Supabase JWT authentication
- ✅ Role-based access control (OWNER, MANAGER, CASHIER, KITCHEN)
- ✅ Item & Category management
- ✅ Batch-based inventory management with FIFO/Weighted Average
- ✅ Transactional billing engine
- ✅ Kitchen Order Ticket (KOT) system
- ✅ Print job queue system
- ✅ Comprehensive audit logging
- ✅ Sales and inventory reports
- ✅ Redis caching layer

## Tech Stack

- **Framework**: NestJS (Node.js + TypeScript)
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma
- **Cache**: Redis (Upstash or local)
- **Auth**: Supabase Auth (JWT)

## Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14.x (or Supabase account)
- Redis >= 7.x
- npm or yarn

## Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run start:dev
```

## Environment Configuration

See `.env.example` for required environment variables:

- Database connection (Supabase PostgreSQL)
- Supabase authentication keys
- Redis connection
- JWT secrets
- CORS settings

## Database Setup

```bash
# Create a new migration
npx prisma migrate dev --name init

# Deploy migrations to production
npm run prisma:deploy

# Open Prisma Studio
npm run prisma:studio
```

## Running the Application

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:3000/api/docs
- API Base: http://localhost:3000/api/v1

## Project Structure

```
src/
├── auth/          # Authentication & JWT verification
├── tenants/       # Tenant (business) management
├── users/         # User & role management
├── items/         # Items & categories
├── inventory/     # Batch-based inventory with FIFO
├── purchases/     # Purchase orders & stock entries
├── billing/       # Transactional billing engine
├── kot/           # Kitchen order tickets
├── printing/      # Print job queue
├── reports/       # Sales & inventory reports
├── audit/         # Audit logging
└── common/        # Shared utilities, guards, decorators
```

## Architecture Principles

1. **Backend-first**: All business logic in backend
2. **Multi-tenant SaaS**: Hard tenant isolation at query level
3. **Clean Architecture**: Controller → Service → Repository
4. **Transactional**: Critical operations use DB transactions
5. **Phase-2 Ready**: Extension points for future features

## Key Design Decisions

### Tenant Isolation
Every query includes `tenant_id` check. Implemented via Prisma middleware and request context.

### Inventory Management
- Batch-based tracking (each purchase = batch)
- FIFO or Weighted Average valuation
- Concurrency-safe deduction
- Automatic rollback on bill cancellation

### Billing Flow
1. Create bill (start transaction)
2. Add items
3. Calculate GST
4. Allocate inventory batches
5. Deduct inventory
6. Save bill
7. Queue print job
8. Log audit trail
9. Commit transaction

### Print System
- Backend generates print payloads
- Jobs queued with status tracking
- External print agent polls for jobs
- Backend never talks to printer directly

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Phase 2 Features (Not Included)

The following are intentionally excluded from Phase 1 but designed for easy extension:

- ❌ Multi-branch management
- ❌ Recipe & raw material consumption
- ❌ Offline sync
- ❌ Loyalty & CRM
- ❌ Advanced RBAC permissions
- ❌ Delivery integrations
- ❌ Accounting exports

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure production database
3. Set secure JWT secrets
4. Enable HTTPS
5. Configure Redis for production
6. Run migrations: `npm run prisma:deploy`
7. Build: `npm run build`
8. Start: `npm run start:prod`

## License

Private/Proprietary

## Support

For issues and questions, contact your development team.
