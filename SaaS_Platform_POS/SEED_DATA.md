# Seed Data Documentation

## Overview
The comprehensive seed script populates the database with sample data for 3 different business types, complete with users, categories, items, and inventory.

## Quick Start

```bash
# Run comprehensive seed (recommended)
npm run seed

# Alternative seed scripts
npm run seed:simple              # Single restaurant tenant
npm run seed:business-types      # Multiple business types (minimal)
```

## Seeded Data

### 🍽️ Restaurant - Golden Fork Restaurant

**Business Type:** RESTAURANT  
**Features:** ✅ KOT System | ✅ Table Management

#### Users
| Username | Role | Password | Email |
|----------|------|----------|-------|
| restaurant_owner | OWNER | Admin@123 | owner@goldenfork.com |
| restaurant_manager | MANAGER | Admin@123 | manager@goldenfork.com |
| restaurant_staff | CASHIER | Admin@123 | staff@goldenfork.com |

#### Categories & Items
- **Starters** (2 items)
  - Chicken Wings (₹250)
  - Paneer Tikka (₹220)
- **Main Course** (2 items)
  - Butter Chicken (₹350)
  - Biryani (₹300)
- **Beverages** (2 items)
  - Fresh Lime Soda (₹80)
  - Mango Lassi (₹100)
- **Desserts** (1 item)
  - Gulab Jamun (₹120)

**Total:** 7 items with 50 units initial inventory each

---

### 🛒 Retail - Fashion Hub Store

**Business Type:** RETAIL  
**Features:** ❌ KOT System | ⚙️ Thermal Printing

#### Users
| Username | Role | Password | Email |
|----------|------|----------|-------|
| retail_owner | OWNER | Admin@123 | owner@fashionhub.com |
| retail_cashier | CASHIER | Admin@123 | cashier@fashionhub.com |

#### Categories & Items
- **Shirts** (2 items)
  - Formal Shirt - White (₹1,299) [SKU: SHT-WHT-001]
  - Casual Shirt - Blue (₹999) [SKU: SHT-BLU-002]
- **Jeans** (1 item)
  - Slim Fit Jeans (₹1,799) [SKU: JNS-SLM-001]
- **Accessories** (1 item)
  - Leather Belt (₹599) [SKU: BLT-LTR-001]

**Total:** 4 items with 30 units initial inventory each

---

### 🥬 Grocery - Fresh Mart Grocery

**Business Type:** GROCERY  
**Features:** ⚖️ Weighted Items | ⚙️ Thermal Printing

#### Users
| Username | Role | Password | Email |
|----------|------|----------|-------|
| grocery_owner | OWNER | Admin@123 | owner@freshmart.com |
| grocery_manager | MANAGER | Admin@123 | manager@freshmart.com |
| grocery_staff | CASHIER | Admin@123 | staff@freshmart.com |

#### Categories & Items
- **Vegetables** (2 items)
  - Tomatoes (₹40/kg)
  - Onions (₹30/kg)
- **Fruits** (2 items)
  - Apples (₹150/kg)
  - Bananas (₹60/kg)
- **Dairy** (1 item)
  - Milk - Full Cream (₹60/L)
- **Grains** (1 item)
  - Basmati Rice (₹120/kg)

**Total:** 6 items with 100 units initial inventory each

---

## Database Summary

After running the seed script, your database will contain:

| Entity | Count |
|--------|-------|
| Tenants | 3 |
| Users | 8 |
| Categories | 11 |
| Items | 17 |
| Inventory Batches | 17 |

## Features by Business Type

| Business Type | KOT System | Tables | Weighted Items |
|---------------|------------|--------|----------------|
| RESTAURANT | ✅ | ✅ | ❌ |
| RETAIL | ❌ | ❌ | ❌ |
| GROCERY | ❌ | ❌ | ✅ |

## Testing Different Features

### Restaurant Features
1. Login as `restaurant_owner` or `restaurant_manager`
2. Navigate to **POS** → Add items to create a bill
3. Navigate to **KOT** → Kitchen Order Tickets are available
4. Check "Send to Kitchen" button appears in POS

### Retail Features
1. Login as `retail_owner` or `retail_cashier`
2. Items have SKU codes for barcode scanning
3. KOT menu item is hidden (not applicable for retail)
4. Inventory tracking with simple units (PCS)

### Grocery Features
1. Login as `grocery_owner`, `grocery_manager`, or `grocery_staff`
2. Items are sold by weight (KG, L)
3. Item type is WEIGHTED for vegetables/fruits
4. Most items have 0% GST (fresh produce)
5. KOT menu is hidden (not applicable for grocery)

## Role Permissions

### OWNER
- Full access to all features
- Can manage users, settings, reports
- Can view financial data

### MANAGER
- Can manage inventory, items, categories
- Can view reports and analytics
- Can create/manage bills and KOTs
- Cannot manage users or critical settings

### CASHIER
- Can create bills and process payments
- Can view items and inventory
- Limited access to reports
- Cannot manage settings or users

### KITCHEN (for restaurants)
- Can view and manage KOTs
- Can mark orders as prepared
- Limited access to other features

## Resetting Data

To clear and reseed the database:

```bash
# Clear existing data and run comprehensive seed
npm run seed

# This will:
# 1. Delete all existing data
# 2. Create fresh tenants, users, items, and inventory
# 3. Display login credentials
```

## Item Types

### SIMPLE
- Fixed quantity items (plates, pieces)
- Used for: Restaurant dishes, retail products
- Examples: Shirts, Shoes, Plates of food

### WEIGHTED
- Items sold by weight/volume
- Used for: Grocery items, bulk products
- Examples: Rice (KG), Milk (L), Vegetables (KG)

## GST Rates Applied

- **0%**: Fresh vegetables, fruits, milk
- **5%**: Food items, cooked meals, rice
- **12%**: Beverages, clothing items
- **18%**: Accessories, electronics

## Inventory Costing

The seed script uses different cost margins:
- **Restaurant**: 40% cost (60% markup)
- **Retail**: 50% cost (50% markup)
- **Grocery**: 70% cost (30% markup)

This reflects typical industry margins for each business type.

## Next Steps

After seeding the database:

1. **Test Login**: Try logging in with different user roles
2. **Create Bills**: Test the POS system with seeded items
3. **Check Reports**: View daily sales, inventory reports
4. **Manage Inventory**: Add new batches, adjust stock
5. **Test KOT**: (Restaurant only) Create kitchen orders

## Troubleshooting

### Seed script fails
```bash
# Ensure database is accessible
npx prisma db push

# Regenerate Prisma client
npm run prisma:generate

# Try seed again
npm run seed
```

### Data already exists
The seed script automatically clears existing data before seeding. If you want to preserve existing data, edit the script and comment out the `clearDatabase()` call.

### Cannot login
- Verify the username is correct (case-sensitive)
- Password for all users is: `Admin@123`
- Check that the backend server is running on port 4000
- Check database connection in `.env` file

## Custom Seeding

To create your own seed data:

1. Copy `scripts/seed-comprehensive.ts`
2. Modify tenant details, users, categories, and items
3. Run with: `npx ts-node scripts/your-seed-script.ts`

## Support

For issues or questions:
- Check backend logs: `npm run start:dev`
- Verify database: `npm run prisma:studio`
- Test API: Use Postman/Thunder Client with provided API examples
