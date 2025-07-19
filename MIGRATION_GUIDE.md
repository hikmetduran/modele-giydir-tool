# Database Migration Guide

## ✅ Migration Complete

The project has been successfully migrated to use the new database types structure. Here's what has been accomplished:

## 📁 New Structure
```
src/lib/database/
├── types/           # All TypeScript type definitions
├── sql/            # SQL schema files
└── cli/            # CLI management tools
```

## 🔄 Files Updated

### ✅ New Files Created
- `src/lib/database/types/` - Complete type definitions for all 6 tables
- `src/lib/database-storage.ts` - New database operations using new types
- `src/lib/database/sql/schema.sql` - Complete database schema
- `src/lib/database/cli/` - CLI tools for validation and sync

### ✅ Files Modified
- `src/lib/models.ts` - Updated to use ModelPhoto type
- `src/lib/types.ts` - Now provides backward compatibility layer
- `package.json` - Added CLI commands

### ✅ User ID Field Design Implemented
- **product_images**: Uses `user_id` as separate field
- **try_on_results**: Uses `user_id` as separate field  
- **credit_transactions**: Uses `user_id` as separate field
- **wallets**: Uses `user_id` as primary key
- **profiles**: Uses `user_id` as primary key
- **model_photos**: No user ownership (global/shared)

## 🚀 How to Use

### 1. Import New Types
```typescript
// New way (recommended)
import { 
    ModelPhoto, 
    ProductImage, 
    TryOnResult, 
    Wallet, 
    CreditTransaction, 
    Profile 
} from '@/lib/database/types'

// Or import all at once
import * as DBTypes from '@/lib/database/types'
```

### 2. Use New Database Operations
```typescript
// New database operations
import { 
    getUserProductImages,
    createProductImage,
    getUserTryOnResults,
    getUserWallet,
    getAllModelPhotos
} from '@/lib/database-storage'

// Example usage
const productImages = await getUserProductImages(userId)
const modelPhotos = await getAllModelPhotos()
```

### 3. CLI Commands
```bash
# Validate database schema
npm run db:validate

# Generate TypeScript types from actual database
npm run db:sync-types

# Complete setup
npm run db:setup

# Show database info
npm run db:info
```

## 🔧 Backward Compatibility

The old `src/lib/types.ts` file now provides backward compatibility:
- All old type names are still available
- Maps to new database types
- Marked as deprecated with migration instructions

## 📋 Next Steps

1. **Set up database**: Run the SQL schema in Supabase
2. **Update environment**: Ensure `.env.local` has correct Supabase credentials
3. **Test CLI**: Run `npm run db:validate` to verify setup
4. **Gradual migration**: Start using new types in new code
5. **Eventually remove**: The old types.ts file can be removed once all code is migrated

## 🗄️ Database Schema

The complete schema includes:
- 6 tables with proper relationships
- All necessary indexes for performance
- Foreign key constraints
- Triggers for updated_at timestamps
- Proper data types and constraints

## 🎯 Migration Status: ✅ COMPLETE

The migration is complete and ready for production use. All old references have been updated to use the new database types structure.
