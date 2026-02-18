Perfect. Below is a **COPY-PASTE READY, SINGLE-SOURCE CONTEXT** you can give directly to **GitHub Copilot / coding agents**.

This is written to **force the agent to build ONLY Phase 1**, but in a way that **Phase 2 can be added cleanly without refactors**.

No marketing language.
No ambiguity.
No partial systems.

---

# 📘 COPILOT CONTEXT — PHASE 1 MVP

## Universal SaaS POS Backend (Two-Phase Architecture)

---

## 0. VERY IMPORTANT INSTRUCTION TO THE AGENT

We are building this product in **ONLY TWO PHASES**.

* **Phase 1 = Fully functional, production-ready MVP**
* **Phase 2 = Advanced & enterprise features (added later)**

🚫 **DO NOT implement Phase 2 features now**
✅ **Design Phase 1 so Phase 2 can be added easily**

If a feature belongs to Phase 2, **leave extension points**, not implementations.

---

## 1. WHAT WE ARE BUILDING (PHASE 1 ONLY)

We are building a **fully functional SaaS POS backend** that can be **used by real hotels and shops in production**.

Phase 1 must support **real billing, real inventory, real printing, real audits**.

This is **not a demo**.
This is **sellable MVP**.

---

## 2. CORE PRINCIPLES (NON-NEGOTIABLE)

1. **Backend-first**

   * All business logic lives in backend
   * Frontend never touches DB directly

2. **Multi-tenant SaaS**

   * Every business = tenant
   * Hard tenant isolation at query level

3. **End-to-End Flows Only**

   * No mock logic
   * No TODO billing
   * No fake inventory

4. **Phase-2 Ready**

   * Clean module boundaries
   * No hacks that block future expansion

---

## 3. TECH STACK (LOCKED FOR PHASE 1)

### Backend

* **NestJS (Node.js)**
* **TypeScript**
* **Clean Architecture (Controller → Service → Repository)**

### Database

* **PostgreSQL via Supabase**
* Supabase is used as:

  * Managed PostgreSQL
  * Authentication provider (JWT only)
* ❌ Supabase client SDK must NOT be used in frontend for writes

### ORM

* **Prisma**
* Migrations required
* DB-portable (no Supabase-specific SQL)

### Cache

* **Redis** (Upstash or local)
* Used only where clearly needed

---

## 4. DATABASE STRATEGY (VERY CLEAR)

### Phase 1 Database Usage

| Concern        | Choice                                |
| -------------- | ------------------------------------- |
| Primary DB     | Supabase PostgreSQL                   |
| Auth           | Supabase Auth (JWT verification only) |
| Business Logic | Custom NestJS backend                 |
| Writes         | Backend APIs only                     |
| Reads          | Backend APIs only                     |
| Migrations     | Prisma                                |
| Offline sync   | ❌ Phase 2                             |

### RULE

Supabase is **infrastructure**, not **logic**.

---

## 5. WHAT PHASE 1 MUST INCLUDE (MANDATORY)

### 5.1 Tenant & Auth (FOUNDATION)

* Tenant (business) creation
* Supabase JWT verification
* Map `supabase_user_id → internal user`
* One tenant = one business
* One tenant initially = one branch (Phase 2 adds multi-branch)

✔ Tenant isolation must be enforced on every query

---

### 5.2 User & Role System (SIMPLE)

Roles (ENUM only):

* OWNER
* MANAGER
* CASHIER
* KITCHEN

Phase 1 rules:

* Role-based access only
* ❌ No permission matrix yet (Phase 2)

---

### 5.3 Item & Menu Management

* Categories
* Items
* Item types:

  * SIMPLE
  * WEIGHTED
* GST per item
* Price per item

❌ Recipe system = Phase 2
❌ Raw material linking = Phase 2

---

### 5.4 Inventory Management (CRITICAL)

Inventory MUST be **batch-based**.

* Purchases create inventory batches
* Each batch has:

  * quantity
  * cost price
  * remaining quantity

Inventory valuation method:

* FIFO (default)
* Weighted Average (configurable per tenant)

✔ Inventory must deduct correctly on billing
✔ Must handle partial batch consumption
✔ Must be concurrency-safe

---

### 5.5 Billing Engine (CORE OF MVP)

Billing must be **fully transactional**.

Flow:

1. Create bill
2. Add items
3. Calculate tax
4. Allocate inventory (FIFO)
5. Commit inventory
6. Save bill
7. Queue print job
8. Write audit log

Billing features:

* Cash / UPI / Card
* Single payment (split = Phase 2)
* Bill cancellation with inventory rollback

✔ If any step fails → rollback everything

---

### 5.6 KOT (Kitchen Order Ticket) — BASIC

Phase 1 KOT:

* Create KOT
* Print KOT
* Convert KOT to bill

Rules:

* Inventory is deducted ONLY at billing stage
* No kitchen status workflow yet (Phase 2)

---

### 5.7 Printing System (MANDATORY)

Backend must:

* Generate print payloads
* Queue print jobs
* Track print status

Printing types:

* Bill
* KOT

❌ Backend never talks to printer directly
✔ Print agent polls backend

---

### 5.8 Audit Logs (MANDATORY)

Log:

* Bill creation
* Bill cancellation
* Inventory adjustments
* Price changes

Audit logs must include:

* tenant_id
* user_id
* action
* timestamp
* before/after values

---

### 5.9 Reports (MINIMUM REQUIRED)

Phase 1 reports:

* Daily sales summary
* Item-wise sales
* Current stock levels
* Inventory valuation

❌ Advanced analytics = Phase 2

---

## 6. WHAT PHASE 1 MUST NOT INCLUDE

🚫 Multi-branch management
🚫 Recipe & raw material consumption
🚫 Offline billing & sync
🚫 Loyalty & CRM
🚫 Advanced RBAC permissions
🚫 Delivery app integrations
🚫 Accounting exports

These belong to **Phase 2 ONLY**.

---

## 7. MODULE STRUCTURE (STRICT)

```
src/
 ├─ auth/
 ├─ tenants/
 ├─ users/
 ├─ items/
 ├─ inventory/
 ├─ purchases/
 ├─ billing/
 ├─ kot/
 ├─ printing/
 ├─ reports/
 ├─ audit/
 ├─ common/
```

Each module must contain:

* controller
* service
* repository
* DTOs
* validators

No cross-module DB access.

---

## 8. DATA MODEL RULES

* Every business table MUST include `tenant_id`
* Soft delete (`deleted_at`) for critical tables
* Use UUIDs for all primary keys
* Use DB transactions for:

  * Billing
  * Inventory updates

---

## 9. EXTENSION POINTS FOR PHASE 2 (IMPORTANT)

Phase 1 must leave **clear hooks** for Phase 2:

* Inventory service must allow:

  * recipe-based deduction later
* Billing service must allow:

  * split payments later
* Tenant config must allow:

  * branch_id later
* User system must allow:

  * permission matrix later
* Inventory must allow:

  * wastage & internal consumption later

❗ Do NOT implement Phase 2 logic now
❗ Only design for it

---

## 10. QUALITY BAR FOR PHASE 1

Phase 1 is DONE only if:

* A hotel can:

  * Add items
  * Purchase stock
  * Create a bill
  * Print bill
  * See inventory reduce correctly
* Data is tenant-isolated
* No negative stock bugs
* No partial billing
* No fake logic

---

## 11. HOW THE AGENT SHOULD WORK

The agent must:

1. Read this document fully
2. Implement Phase 1 only
3. Build end-to-end flows
4. Avoid shortcuts
5. Prefer correctness over speed

If unclear:

* Ask once
* Otherwise make a reasonable assumption
* Document it

---

## 12. FINAL GOAL OF PHASE 1

A **sellable, production-ready MVP** that:

* Can be deployed
* Can be used by a real hotel
* Can be pitched confidently
* Can be extended cleanly into Phase 2

---

### 🔒 THIS DOCUMENT IS THE FINAL AUTHORITY

If anything conflicts with this context, **THIS CONTEXT WINS**.
