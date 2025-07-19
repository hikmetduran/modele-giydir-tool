# Database Structure Documentation

This directory contains the complete database schema and type definitions for the Modele Giydir application.

## 📁 Directory Structure

```
src/lib/database/
├── types/                    # TypeScript type definitions
│   ├── common.ts            # Shared types and enums
│   ├── model_photos.ts      # AI-generated model images
│   ├── product_images.ts    # User-uploaded clothing images
│   ├── try_on_results.ts    # AI try-on processing results
│   ├── wallets.ts           # User credit balances
│   ├── credit_transactions.ts # Credit change history
│   ├── profiles.ts          # Extended user profiles
│   └── index.ts             # Central exports
├── sql/                     # SQL schema files
│   ├── migrations/          # Individual table migrations
│   │   ├── 001_create_model_photos.sql
│   │   ├── 002_create_product_images.sql
│   │   ├── 003_create_try_on_results.sql
│   │   ├── 004_create_wallets.sql
│   │   ├── 005_create_credit_transactions.sql
│   │   └── 006_create_profiles.sql
│   ├── schema.sql           # Complete schema in one file
│   └── seeds/               # Seed data (empty for now)
└── cli/                     # CLI management tools
    ├── validate-schema.ts   # Schema validation
    ├── sync-types.ts        # Type generation from DB
    └── index.ts             # Main CLI interface
```

## 🗄️ Database Tables

### 1. model_photos
**Purpose**: AI-generated model images for try-on functionality
- **Primary Key**: `id` (UUID)
- **Fields**: name, description, image_url, image_path, gender, body_type, is_active, sort_order
- **Indexes**: gender, is_active, sort_order

### 2. product_images
**Purpose**: User-uploaded clothing/product images
- **Primary Key**: `id` (UUID)
- **Foreign Key**: `user_id` → auth.users(id)
- **Fields**: original_filename, image_url, image_path, file_size, mime_type, width, height
- **Indexes**: user_id, created_at

### 3. try_on_results
**Purpose**: Results from AI clothing try-on processing
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: 
  - `user_id` → auth.users(id)
  - `product_image_id` → product_images(id)
  - `model_photo_id` → model_photos(id)
- **Fields**: result_image_url, status, credits_used, metadata, error_message
- **Indexes**: user_id, product_image_id, model_photo_id, status

### 4. wallets
**Purpose**: User credit balance system
- **Primary Key**: `user_id` (UUID) - same as auth.users(id)
- **Fields**: credits, total_earned, total_spent
- **Indexes**: credits, updated_at
- **Triggers**: Auto-update updated_at

### 5. credit_transactions
**Purpose**: History of credit changes
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: 
  - `user_id` → auth.users(id)
  - `related_try_on_id` → try_on_results(id) (nullable)
- **Fields**: type, amount, credits_before, credits_after, description, metadata
- **Indexes**: user_id, type, created_at, related_try_on_id

### 6. profiles
**Purpose**: Extended user profile information
- **Primary Key**: `user_id` (UUID) - same as auth.users(id)
- **Fields**: email, full_name, avatar_url, phone_number, preferences, is_email_verified
- **Indexes**: email, full_name, updated_at
- **Triggers**: Auto-update updated_at

## 🎯 User ID Field Design

Following your request, the tables use different approaches for user identification:

### Tables using `user_id` as separate field:
- **product_images**: `user_id` UUID → auth.users(id)
- **try_on_results**: `user_id` UUID → auth.users(id)  
- **credit_transactions**: `user_id` UUID → auth.users(id)

### Tables using `user_id` as primary key:
- **wallets**: `user_id` UUID PRIMARY KEY → auth.users(id)
- **profiles**: `user_id` UUID PRIMARY KEY → auth.users(id)

### Tables without user ownership:
- **model_photos**: Global/shared model images (no user_id)

## 🚀 CLI Usage

### Available Commands
```bash
# Validate database schema
npm run db:validate

# Generate TypeScript types from actual database
npm run db:sync-types

# Complete setup (schema + validation)
npm run db:setup

# Show database information
npm run db:info
```

### Environment Setup
Ensure your `.env.local` contains:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🔧 Database Setup

### Option 1: Complete Schema (Recommended)
Run the complete schema in Supabase SQL editor:
```sql
-- Copy contents from src/lib/database/sql/schema.sql
```

### Option 2: Individual Migrations
Run each migration in order:
1. `001_create_model_photos.sql`
2. `002_create_product_images.sql`
3. `003_create_try_on_results.sql`
4. `004_create_wallets.sql`
5. `005_create_credit_transactions.sql`
6. `006_create_profiles.sql`

## 📊 TypeScript Usage

### Import all types
```typescript
import { 
  ModelPhoto, 
  ProductImage, 
  TryOnResult, 
  Wallet, 
  CreditTransaction, 
  Profile 
} from '@/lib/database/types';
```

### Use with Supabase
```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database/types';

const supabase = createClient<Database>(url, key);
```

## 🔍 Schema Validation

The CLI tools automatically validate:
- ✅ All expected tables exist
- ✅ All columns have correct types
- ✅ All indexes are present
- ✅ Foreign key relationships are correct
- ✅ Default values match expectations

## 🔄 Type Synchronization

The `sync-types` command generates TypeScript types directly from your actual database schema, ensuring they always stay in sync.

## 📋 Next Steps

1. Set up your Supabase project
2. Run the schema SQL in Supabase SQL editor
3. Configure environment variables
4. Run `npm run db:validate` to verify setup
5. Run `npm run db:sync-types` to generate types
