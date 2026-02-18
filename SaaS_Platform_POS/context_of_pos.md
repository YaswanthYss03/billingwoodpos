

---

first focus is web based ,we will work on the app later 


# 📘 MASTER CONTEXT — UNIVERSAL SaaS POS & BILLING PLATFORM

## 1. WHAT WE ARE BUILDING (VERY IMPORTANT)

We are building a **Universal, Modular, SaaS-based POS & Billing Platform** designed to work for:

* Small shops
* Sweet shops
* Restaurants & hotels
* Supermarkets
* Any business that sells billable items

The system must **adapt automatically** based on:

* Business type
* Subscription plan
* Enabled features

This is **not just billing software**.
It is a **complete POS + Inventory + Purchase + Reporting system** that scales from a single shop to multi-branch enterprises.

---

## 2. CORE PRINCIPLES (NON-NEGOTIABLE)

1. **Single Product, Multiple Use Cases**

   * Same backend
   * Same database
   * Different flows via feature flags

2. **End-to-End Ownership**

   * From purchase → inventory → sale → reporting → audit
   * No external dependency for core flows

3. **Offline-First**

   * Billing must work even without internet
   * Sync automatically when internet returns

4. **Silent Printing**

   * No browser print dialogs
   * Auto-print for Bills & KOT
   * Works with Wi-Fi & Bluetooth thermal printers

5. **Modular & Subscription-Based**

   * Features unlocked by plan
   * No code changes per customer

---

## 3. SYSTEM ARCHITECTURE (HIGH LEVEL)

### Applications

* Web App (Primary – Tablet/Desktop, PWA)
* Mobile App (Android – for Bluetooth printing)
* Local Print Agent (for silent printing)

### Backend

* REST APIs
* Central business logic
* Multi-tenant SaaS

### Databases

* PostgreSQL → Source of truth
* Redis → Real-time & performance
* Local DB (SQLite / IndexedDB) → Offline mode

---

## 4. BUSINESS TYPES & FEATURE ADAPTATION

### Business Type Configuration

Each tenant selects:

* Business category (shop / hotel / supermarket)
* Inventory method (FIFO / Weighted Average)
* Printer setup
* Tax rules

This configuration **drives UI + logic automatically**.

---

## 5. CORE MODULES (END-TO-END)

---

### MODULE 1: AUTH & TENANT MANAGEMENT

#### What to Build

* Tenant (business) registration
* Subscription plan selection
* Business configuration setup

#### Key Concepts

* Multi-tenant system using `tenant_id`
* Strict data isolation

#### Output

* A business can log in
* Sees only its own data
* Features enabled based on plan

---

### MODULE 2: USER & ROLE MANAGEMENT

#### Roles

* Owner
* Manager
* Cashier
* Kitchen Staff

#### Rules

* Role-based access control (RBAC)
* UI elements hidden based on role
* All actions logged

---

### MODULE 3: ITEM & MENU MANAGEMENT

#### Item Types

* Simple item (Pen, Sweet)
* Weighted item (Sweet by kg)
* Recipe-based item (Hotel dishes)

#### Features

* Category mapping
* GST configuration per item
* Price history tracking

---

### MODULE 4: BILLING ENGINE (CORE)

#### Flow

1. Create bill
2. Add items
3. Apply tax & discount
4. Select payment mode
5. Save bill
6. Trigger silent print
7. Update inventory
8. Log audit entry

#### Must Support

* Cash / UPI / Card / Split payment
* Bill edit & cancellation rules
* Refunds

Billing must be **atomic & transactional**.

---

### MODULE 5: KOT & TABLE MANAGEMENT (HOTEL MODE)

#### Flow

1. Table selected
2. Items added
3. Order placed
4. KOT generated
5. KOT printed in kitchen
6. Order status updated
7. Items moved to final bill

#### Printer Rules

* Different printers per kitchen
* Silent printing only

---

### MODULE 6: INVENTORY MANAGEMENT (ADVANCED)

#### Inventory Concepts

* Batch-based inventory
* FIFO / Weighted Average valuation
* Real-time stock updates

#### Purchase Flow

1. Supplier selected
2. Purchase bill entered
3. Inventory batch created
4. Stock updated

#### Sale Flow

1. Item sold
2. Stock reduced (FIFO logic)
3. COGS calculated

---

### MODULE 7: RECIPE & RAW MATERIAL CONSUMPTION (CRITICAL)

#### Example

* 1 Omelette → 1 Egg
* 1 Egg Burji → 2 Eggs

#### Flow

* Dish sold
* Ingredients auto-deducted
* Cost calculated per dish

This ensures **accurate food cost & profit reporting**.

---

### MODULE 8: WASTAGE, DAMAGE & INTERNAL CONSUMPTION

#### Must Support

* Wastage entry
* Damage tracking
* Staff meals
* Reason tagging
* Optional approval flow

This prevents inventory mismatch.

---

### MODULE 9: PURCHASE & SUPPLIER MANAGEMENT

#### Features

* Vendor creation
* Purchase bills
* GST input tracking
* Supplier ledger
* Expense categorization

---

### MODULE 10: PRINTING SYSTEM (CRITICAL)

#### Requirements

* Silent printing only
* No browser dialog
* Wi-Fi & Bluetooth printers
* Thermal printers

#### Architecture

* Web App → Print API
* Local Print Agent → Printer

---

### MODULE 11: OFFLINE MODE & SYNC

#### Offline Capabilities

* Create bills
* Save locally
* Print bills
* Queue sync operations

#### Sync Logic

* Timestamp-based conflict resolution
* Idempotent operations
* Retry-safe

---

### MODULE 12: REPORTS & ANALYTICS

#### Owner-Focused Reports

* Daily sales
* Profit & loss
* Food cost %
* Dead stock
* Top-selling items
* Peak hours

#### Philosophy

Reports must **answer questions**, not dump tables.

---

### MODULE 13: AUDIT & COMPLIANCE

#### Audit Logs

* Bill edits
* Price changes
* Inventory adjustments
* User actions

This builds **trust & enterprise readiness**.

---

## 6. DATABASE DESIGN PRINCIPLES

* PostgreSQL as primary DB
* ACID transactions mandatory
* Batch-based inventory tables
* `tenant_id` in every business table
* Soft deletes for audit safety

---

## 7. SUBSCRIPTION & FEATURE GATING

#### Plans

* Starter
* Business
* Pro
* Enterprise

#### Logic

* Backend enforces features
* Frontend adapts UI
* No hardcoding per customer

---

## 8. NON-FUNCTIONAL REQUIREMENTS

* Scalable to 100k+ businesses
* Secure (JWT, role checks)
* Fast (Redis for real-time)
* Hardware-agnostic
* Zero-training UI

---

## 9. END GOAL

Build a **serious, enterprise-grade SaaS POS platform** that:

* Starts simple
* Grows with the customer
* Is hard to replace
* Generates recurring revenue

---

## 10. DEVELOPMENT EXPECTATION

Anything built must:

* Be production-grade
* Follow clean architecture
* Include migrations
* Include error handling
* Be extensible

**No mock-only code. No partial flows. Everything end-to-end.**

---
#### BACKEND STRUCTURE
---

# 📘 CUSTOM BACKEND CONTEXT

## Universal SaaS POS & Billing Platform

---

## 1. PURPOSE OF THIS BACKEND

We are building a **custom backend** for a **multi-tenant SaaS POS & Billing system**.

This backend is the **single source of truth and business logic**.

### ❗ NON-NEGOTIABLE RULE

* **Frontend must NEVER talk directly to the database**
* **Supabase is used ONLY as PostgreSQL + Auth**
* **ALL business rules live in this backend**

This backend must be **production-grade**, **scalable**, and **portable**.

---

## 2. WHAT THIS BACKEND IS RESPONSIBLE FOR

This backend must handle **everything end-to-end**:

* Authentication validation (JWT)
* Tenant (business) isolation
* Billing logic
* Inventory (FIFO / Weighted Average)
* Recipe-based raw material deduction
* KOT & table lifecycle
* Offline sync conflict handling
* Printing command orchestration
* Audit logging
* Subscription feature enforcement

Nothing critical is allowed to be “frontend-only”.

---

## 3. TECH STACK (MANDATORY)

* **Runtime**: Node.js (LTS)
* **Framework**: NestJS (preferred) or Express with clean architecture
* **Database**: PostgreSQL (Supabase-hosted)
* **ORM**: Prisma or Drizzle (must support migrations)
* **Cache / Realtime**: Redis
* **Auth**: Supabase JWT verification
* **API Style**: REST (clear, predictable endpoints)

---

## 4. CORE ARCHITECTURE RULES

### 4.1 Clean Architecture

Code must be separated into:

```
/modules
  /billing
  /inventory
  /kot
  /tables
  /recipes
  /purchases
  /reports
  /auth
  /tenants
  /users
```

Each module must contain:

* Controller (HTTP)
* Service (business logic)
* Repository (DB access)
* DTOs
* Validators

No business logic in controllers.

---

### 4.2 Multi-Tenant SaaS Model

Every business = **Tenant**

Rules:

* Every business table MUST contain `tenant_id`
* Tenant isolation enforced in backend
* Tenant ID derived from JWT + internal mapping
* No cross-tenant queries allowed

---

## 5. AUTH & SECURITY MODEL

### Authentication

* Use Supabase Auth only for **identity**
* Backend verifies JWT on every request
* Backend maps `user_id → tenant_id`

### Authorization

* Role-based access control (RBAC)
* Roles: OWNER, MANAGER, CASHIER, KITCHEN
* Permissions enforced in backend services

### Audit Safety

* Every destructive action logged
* Bill edits, cancellations, inventory adjustments tracked

---

## 6. BILLING ENGINE (CRITICAL)

### Billing Must Be:

* Atomic
* Transactional
* Idempotent

### Billing Flow (End-to-End)

1. Create bill
2. Add items
3. Calculate tax & discount
4. Lock inventory
5. Deduct stock
6. Save bill
7. Generate print command
8. Commit transaction
9. Emit realtime event
10. Write audit log

If any step fails → **rollback everything**.

---

## 7. INVENTORY MANAGEMENT RULES

### Inventory Model

* Batch-based inventory
* Each purchase creates a batch
* Inventory valuation method per tenant:

  * FIFO (default for hotels)
  * Weighted Average (default for shops)

### FIFO Logic

* Always consume oldest batch first
* Use row-level locks
* Prevent race conditions

### Inventory Must Track:

* Purchases
* Sales
* Wastage
* Damage
* Internal consumption (staff meals)

---

## 8. RECIPE & RAW MATERIAL CONSUMPTION

This backend must support **recipe-based deduction**.

### Example

* 1 Omelette → 1 Egg
* 1 Egg Burji → 2 Eggs

### Rule

* When a dish is sold:

  * Deduct ingredients automatically
  * Calculate per-dish cost
  * Affect profit reports

Recipe logic must integrate with FIFO inventory.

---

## 9. KOT & TABLE MANAGEMENT

### Table Lifecycle

* FREE → OCCUPIED → BILLED

### KOT Flow

1. Order placed
2. KOT generated
3. KOT printed silently
4. Kitchen updates status
5. Items move to bill

KOT must NOT affect inventory until confirmed (configurable).

---

## 10. PRINTING ORCHESTRATION (NO DIRECT PRINTING)

Backend **never prints directly**.

### Backend Responsibility

* Generate print payloads
* Send print jobs to local print agent
* Track print status

### Print Types

* Bill print
* KOT print
* Report print

---

## 11. OFFLINE MODE & SYNC

### Offline Expectations

* Bills can be created offline
* Bills can be printed offline
* Data stored locally

### Sync Rules

* Backend accepts queued operations
* Operations must be idempotent
* Conflict resolution via timestamps & UUIDs

Backend must expose **sync-safe APIs**.

---

## 12. SUBSCRIPTION & FEATURE GATING

### Backend Enforces Features

* No frontend-only restrictions
* Feature flags evaluated per request

Example:

* KOT API blocked if plan doesn’t allow it
* Advanced reports blocked on lower plans

---

## 13. REPORTING ENGINE

Reports must be:

* Owner-focused
* Derived from backend queries
* Accurate (uses real COGS)

Examples:

* Daily sales
* Food cost %
* Dead stock
* Profit summary
* Peak hours

---

## 14. DATABASE RULES

* PostgreSQL only
* No Supabase-specific SQL
* Use migrations
* Soft deletes for critical tables
* Timezone-safe timestamps

---

## 15. PERFORMANCE & SCALING

* Redis for:

  * Active tables
  * KOT queues
  * Sessions
* Pagination everywhere
* Index critical columns
* Partition large tables later

---

## 16. ERROR HANDLING & LOGGING

* Structured errors
* Meaningful error codes
* No silent failures
* Centralized logging

---

## 17. WHAT NOT TO DO (IMPORTANT)

🚫 No business logic in frontend
🚫 No direct DB access from frontend
🚫 No Supabase client SDK in frontend for writes
🚫 No hardcoded plans or roles
🚫 No partial implementations

Everything must be **end-to-end and production-ready**.

---

## 18. FINAL GOAL OF THIS BACKEND

Build a **serious SaaS backend** that:

* Can handle money safely
* Scales to 100k+ businesses
* Is audit-safe
* Is hard to replace
* Can outlive Supabase if needed

This backend is the **brain of the company**.

---

## ✅ HOW THE CODING AGENT SHOULD WORK

The agent should:

* Read this context fully
* Respect architecture boundaries
* Build modules end-to-end
* Ask clarifying questions ONLY if unavoidable
* Prefer correctness over shortcuts

---




