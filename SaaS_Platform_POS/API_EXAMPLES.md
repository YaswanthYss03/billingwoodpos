# API Usage Examples

## Authentication Flow

### 1. Create Tenant (Public)

```bash
POST /api/v1/tenants
Content-Type: application/json

{
  "name": "Grand Hotel",
  "businessType": "HOTEL",
  "gstNumber": "29ABCDE1234F1Z5",
  "address": "123 Main Street, Bangalore",
  "phone": "+919876543210",
  "email": "contact@grandhotel.com",
  "inventoryMethod": "FIFO"
}
```

### 2. Create User Mapping (Public)

After creating a user in Supabase Auth:

```bash
POST /api/v1/users
Content-Type: application/json

{
  "tenantId": "uuid-from-step-1",
  "supabaseUserId": "supabase-user-uuid",
  "email": "manager@grandhotel.com",
  "name": "John Manager",
  "phone": "+919876543210",
  "role": "MANAGER"
}
```

### 3. Login via Supabase

Use Supabase client library to login and get JWT token.

### 4. Access Protected Endpoints

```bash
GET /api/v1/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

## Complete Workflow Example

### Setup: Categories and Items

```bash
# Create Beverages Category
POST /api/v1/categories
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "name": "Beverages",
  "description": "Hot and cold drinks",
  "sortOrder": 1
}

# Create Food Category
POST /api/v1/categories
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "name": "Food",
  "description": "Main course items"
}

# Create Cappuccino Item
POST /api/v1/items
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "categoryId": "beverages-category-id",
  "name": "Cappuccino",
  "description": "Classic Italian coffee",
  "sku": "BEV-CAP-001",
  "itemType": "SIMPLE",
  "price": 150.00,
  "gstRate": 5.0,
  "trackInventory": true,
  "unit": "PCS"
}

# Create Biryani Item
POST /api/v1/items
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "categoryId": "food-category-id",
  "name": "Chicken Biryani",
  "description": "Hyderabadi style chicken biryani",
  "sku": "FOOD-BIR-001",
  "itemType": "SIMPLE",
  "price": 250.00,
  "gstRate": 5.0,
  "trackInventory": true,
  "unit": "PCS"
}
```

### Purchase Flow

```bash
# 1. Create Purchase Order
POST /api/v1/purchases
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "supplierName": "Coffee Bean Suppliers",
  "invoiceNumber": "INV-2024-001",
  "purchaseDate": "2024-02-14T10:00:00Z",
  "notes": "Monthly coffee stock",
  "items": [
    {
      "itemId": "cappuccino-item-id",
      "quantity": 100,
      "costPrice": 75.00
    },
    {
      "itemId": "biryani-item-id",
      "quantity": 50,
      "costPrice": 150.00
    }
  ]
}

# Response includes purchase ID - save it!

# 2. Receive Purchase (Creates Inventory Batches)
POST /api/v1/purchases/{purchase-id}/receive
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "receivedDate": "2024-02-14T14:00:00Z"
}

# This automatically creates inventory batches with FIFO tracking!

# 3. Check Inventory
GET /api/v1/inventory/stock/{item-id}
Authorization: Bearer TOKEN

# Response shows current stock level
```

### KOT Flow (Restaurant)

```bash
# 1. Create KOT
POST /api/v1/kot
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "tableNumber": "5",
  "notes": "Extra spicy",
  "items": [
    {
      "itemId": "biryani-item-id",
      "quantity": 2,
      "notes": "Extra raita"
    },
    {
      "itemId": "cappuccino-item-id",
      "quantity": 1
    }
  ]
}

# Response includes KOT ID and print job is automatically queued

# 2. Update KOT Status (Kitchen updates)
PATCH /api/v1/kot/{kot-id}/status
Authorization: Bearer TOKEN (Kitchen staff)
Content-Type: application/json

{
  "status": "PREPARING"
}

# Then mark as READY
PATCH /api/v1/kot/{kot-id}/status
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "status": "READY"
}
```

### Billing Flow

```bash
# 1. Create Bill (Direct or from KOT)
POST /api/v1/billing
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "kotId": "kot-id-from-previous-step",  # Optional
  "items": [
    {
      "itemId": "biryani-item-id",
      "quantity": 2
    },
    {
      "itemId": "cappuccino-item-id",
      "quantity": 1
    }
  ],
  "paymentMethod": "UPI",
  "customerName": "Raj Kumar",
  "customerPhone": "+919898989898",
  "notes": "Table 5"
}

# This transaction will:
# - Create bill
# - Calculate GST automatically
# - Deduct inventory using FIFO
# - Queue bill print job
# - Create audit log
# - All in one atomic transaction!

# Response includes full bill details with batch allocations

# 2. Cancel Bill (Manager only)
POST /api/v1/billing/{bill-id}/cancel
Authorization: Bearer TOKEN (Manager/Owner)
Content-Type: application/json

{
  "reason": "Customer requested refund"
}

# This will:
# - Mark bill as cancelled
# - Restore inventory to original batches
# - Create audit log
```

### Print Agent Polling

```bash
# Print agent polls for pending jobs
GET /api/v1/printing/pending?tenantId={tenant-id}&limit=10

# Returns pending print jobs with full payload

# Agent updates status after printing
PATCH /api/v1/printing/{job-id}/status?tenantId={tenant-id}
Content-Type: application/json

{
  "status": "COMPLETED"
}

# Or if failed
PATCH /api/v1/printing/{job-id}/status?tenantId={tenant-id}
Content-Type: application/json

{
  "status": "FAILED",
  "error": "Printer offline"
}
```

### Reports

```bash
# Dashboard Metrics
GET /api/v1/reports/dashboard
Authorization: Bearer TOKEN

# Daily Sales Summary
GET /api/v1/reports/daily-sales?date=2024-02-14
Authorization: Bearer TOKEN

# Sales Summary (Date Range)
GET /api/v1/reports/sales-summary?startDate=2024-02-01&endDate=2024-02-14
Authorization: Bearer TOKEN

# Item-wise Sales
GET /api/v1/reports/item-wise-sales?startDate=2024-02-01&endDate=2024-02-14
Authorization: Bearer TOKEN

# Current Inventory
GET /api/v1/reports/current-inventory
Authorization: Bearer TOKEN

# Inventory Valuation
GET /api/v1/reports/inventory-valuation
Authorization: Bearer TOKEN

# Top Selling Items
GET /api/v1/reports/top-selling?days=30&limit=10
Authorization: Bearer TOKEN
```

### Inventory Management

```bash
# Get All Batches
GET /api/v1/inventory/batches
Authorization: Bearer TOKEN

# Get Batches for Specific Item
GET /api/v1/inventory/batches?itemId={item-id}
Authorization: Bearer TOKEN

# Get Stock Level
GET /api/v1/inventory/stock/{item-id}
Authorization: Bearer TOKEN

# Manual Inventory Adjustment (Manager only)
POST /api/v1/inventory/adjust
Authorization: Bearer TOKEN (Manager/Owner)
Content-Type: application/json

{
  "batchId": "batch-id",
  "newQuantity": 45,
  "reason": "Spillage during service"
}

# Get Low Stock Items
GET /api/v1/inventory/low-stock?threshold=10
Authorization: Bearer TOKEN

# Inventory Valuation
GET /api/v1/inventory/valuation
Authorization: Bearer TOKEN
```

### Audit Logs

```bash
# Get All Tenant Logs
GET /api/v1/audit?limit=100&offset=0
Authorization: Bearer TOKEN (Manager/Owner)

# Filter by Entity
GET /api/v1/audit?entity=Bill&action=CANCEL
Authorization: Bearer TOKEN

# Get Entity History
GET /api/v1/audit/entity/Bill/{bill-id}
Authorization: Bearer TOKEN

# Get User Activity
GET /api/v1/audit/user/{user-id}?limit=50
Authorization: Bearer TOKEN
```

## Response Examples

### Successful Bill Creation

```json
{
  "id": "bill-uuid",
  "tenantId": "tenant-uuid",
  "userId": "user-uuid",
  "billNumber": "BILL20240200001",
  "subtotal": "550.00",
  "taxAmount": "27.50",
  "totalAmount": "577.50",
  "paymentMethod": "UPI",
  "paymentStatus": "PAID",
  "status": "COMPLETED",
  "customerName": "Raj Kumar",
  "customerPhone": "+919898989898",
  "billedAt": "2024-02-14T15:30:00.000Z",
  "items": [
    {
      "id": "item-uuid",
      "itemId": "biryani-item-id",
      "quantity": "2",
      "price": "250.00",
      "gstRate": "5.00",
      "gstAmount": "25.00",
      "totalAmount": "525.00",
      "item": {
        "name": "Chicken Biryani",
        "sku": "FOOD-BIR-001"
      },
      "batches": [
        {
          "batchId": "batch-uuid",
          "quantityUsed": "2",
          "costPrice": "150.00"
        }
      ]
    }
  ],
  "user": {
    "name": "John Manager",
    "email": "manager@grandhotel.com"
  }
}
```

### Inventory Report

```json
{
  "items": [
    {
      "itemName": "Cappuccino",
      "itemSku": "BEV-CAP-001",
      "category": "Beverages",
      "unit": "PCS",
      "totalQuantity": 95,
      "totalValue": 7125.00,
      "batchCount": 1,
      "oldestBatch": "2024-02-14T14:00:00.000Z"
    }
  ],
  "totalValue": 7125.00,
  "totalItems": 1,
  "totalBatches": 1
}
```

## Error Responses

### Insufficient Inventory

```json
{
  "statusCode": 400,
  "message": "Insufficient inventory. Required: 10, Available: 5",
  "timestamp": "2024-02-14T15:30:00.000Z",
  "path": "/api/v1/billing"
}
```

### Unauthorized

```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "timestamp": "2024-02-14T15:30:00.000Z"
}
```

### Forbidden (Role Check Failed)

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "timestamp": "2024-02-14T15:30:00.000Z"
}
```
