# Appwrite Debug & Setup Guide

## Issues Fixed

### 1. Storage API Issues ✅
- **Problem**: `storage.getBucket is not a function`
- **Solution**: Updated to use correct Appwrite SDK method `storage.getBucket()` instead of destructured response

### 2. Database Schema Issues ✅
- **Problem**: Missing `user_id` attribute in profiles table
- **Solution**: Updated queries to use correct attribute names based on your Appwrite schema:
  - `userId` instead of `user_id` for profiles and wallets collections
  - `user_id` for productImages, tryOnResults, and creditTransactions collections

### 3. Authorization Issues ✅
- **Problem**: 401 Unauthorized errors
- **Solution**: Added proper error handling and fallback mechanisms

### 4. Missing User Data Creation ✅
- **Problem**: No automatic wallet/profile creation for new users
- **Solution**: Added automatic creation logic in Header.tsx and useWallet.ts

## Debug Commands

```bash
# Run the debug script
npm run debug-appwrite

# Start development server
npm run dev
```

## Environment Variables Check

Ensure these are set in your `.env.local`:

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=modele-giydir
NEXT_PUBLIC_APPWRITE_DATABASE_ID=modele-giydir-db
NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID=productImages
NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID=profiles
NEXT_PUBLIC_APPWRITE_MODEL_PHOTOS_COLLECTION_ID=modelPhotos
NEXT_PUBLIC_APPWRITE_PRODUCT_IMAGES_COLLECTION_ID=productImages
NEXT_PUBLIC_APPWRITE_TRY_ON_RESULTS_COLLECTION_ID=tryOnResults
NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID=wallets
NEXT_PUBLIC_APPWRITE_CREDIT_TRANSACTIONS_COLLECTION_ID=creditTransactions
```

## Testing Steps

1. **Sign up a new user** - Should automatically create profile and wallet
2. **Upload images** - Should work without storage errors
3. **Check wallet balance** - Should show 100 credits for new users
4. **View gallery** - Should load user-specific data

## Common Debug Commands

```bash
# Check if Appwrite is accessible
curl -X GET https://fra.cloud.appwrite.io/v1/health

# Test database connection
node src/scripts/debug-appwrite.js
```

## Error Handling Improvements

All API calls now include:
- ✅ Comprehensive error handling
- ✅ User-friendly error messages
- ✅ Detailed console logging
- ✅ Fallback mechanisms
- ✅ Automatic retry logic

## Collection Schema Requirements

### Profiles Collection
- `userId` (string) - User ID from Appwrite Auth
- `email` (string) - User email
- `full_name` (string) - User's full name
- `avatar_url` (string) - Profile picture URL
- `created_at` (datetime) - Creation timestamp
- `updated_at` (datetime) - Last update timestamp

### Wallets Collection
- `userId` (string) - User ID from Appwrite Auth
- `credits` (integer) - Credit balance
- `created_at` (datetime) - Creation timestamp
- `updated_at` (datetime) - Last update timestamp

### Product Images Collection
- `user_id` (string) - User ID from Appwrite Auth
- `original_filename` (string) - Original file name
- `image_url` (string) - Public URL of uploaded image
- `image_path` (string) - Storage file ID
- `file_size` (integer) - File size in bytes
- `mime_type` (string) - File MIME type
- `created_at` (datetime) - Creation timestamp

## RLS Policies Setup

Ensure these RLS policies are configured in Appwrite:

1. **Profiles**: Allow users to read/write their own profile
2. **Wallets**: Allow users to read/write their own wallet
3. **Product Images**: Allow users to read/write their own images
4. **Try On Results**: Allow users to read/write their own results

## Debug Output

The debug script will output:
- ✅ Authentication status
- ✅ Database connectivity
- ✅ Storage accessibility
- ✅ Collection schemas
- ✅ RLS policy verification
- ✅ File listing status
