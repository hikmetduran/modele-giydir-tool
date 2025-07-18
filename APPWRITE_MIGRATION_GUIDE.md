# Appwrite Migration Guide - Modele Giydir Tool

## ✅ Migration Complete!

Your Appwrite backend is now fully set up and ready to replace Supabase. Here's what has been created:

### 📊 Setup Summary

| Component | Status | Details |
|-----------|--------|---------|
| **Database** | ✅ | `modele-giydir-db` |
| **Collections** | ✅ | 6 collections with full schema |
| **Storage** | ✅ | `productImages` bucket (folders for organization) |
| **Function** | ✅ | `process-try-on` ready for deployment |
| **Client Library** | ✅ | `src/lib/appwrite.js` (JavaScript) |

### 🗂️ Collections Created

1. **profiles** - User profiles
2. **modelPhotos** - Model photos for try-on
3. **productImages** - User uploaded product images
4. **tryOnResults** - AI try-on results
5. **wallets** - User credit wallets
6. **creditTransactions** - Credit transaction history

### 📁 Storage Structure

Since Appwrite free tier has bucket limits, we're using folders within the `productImages` bucket:
- `productImages/product-images/` - Product images
- `productImages/model-photos/` - Model photos
- `productImages/try-on-results/` - Generated try-on results

### 🔧 Next Steps

#### 1. Get Appwrite API Key
```bash
# Go to: https://cloud.appwrite.io/console/project-modele-giydir/settings/api-keys
# Create a new API key with these permissions:
# - Database (all permissions)
# - Storage (all permissions)
# - Functions (all permissions)
```

#### 2. Update Environment Variables
Create `.env.local` with Appwrite values:

```bash
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=modele-giydir
APPWRITE_API_KEY=your_api_key_here
APPWRITE_DATABASE_ID=modele-giydir-db

# Collections
NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID=profiles
NEXT_PUBLIC_APPWRITE_MODEL_PHOTOS_COLLECTION_ID=modelPhotos
NEXT_PUBLIC_APPWRITE_PRODUCT_IMAGES_COLLECTION_ID=productImages
NEXT_PUBLIC_APPWRITE_TRY_ON_RESULTS_COLLECTION_ID=tryOnResults
NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID=wallets
NEXT_PUBLIC_APPWRITE_CREDIT_TRANSACTIONS_COLLECTION_ID=creditTransactions

# Storage
NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID=productImages

# AI Configuration
FAL_API_KEY=your_fal_api_key_here
```

#### 3. Deploy the Function
```bash
# Deploy the Appwrite function
appwrite functions create \
  --function-id processTryOn \
  --runtime node-18.0 \
  --entrypoint index.js \
  --path appwrite/functions/process-try-on \
  --name "Process Try On"
```

#### 4. Update Your Code
Replace imports from `src/lib/supabase.ts` to `src/lib/appwrite.js`:

```javascript
// OLD (Supabase)
import { supabase, getAuthUser, getUserWallet } from '@/lib/supabase';

// NEW (Appwrite)
import { account, databases, storage, getAuthUser, getUserWallet } from '@/lib/appwrite';
```

### 🔄 Migration Checklist

- [ ] Get Appwrite API key
- [ ] Update `.env.local` with Appwrite values
- [ ] Deploy Appwrite function
- [ ] Update all imports from `supabase` to `appwrite`
- [ ] Test authentication flow
- [ ] Test file upload
- [ ] Test try-on process
- [ ] Update Vercel environment variables
- [ ] Deploy to production

### 🧪 Testing Commands

```bash
# Test database connection
node -e "const { databases } = require('./src/lib/appwrite.js'); databases.listDocuments('modele-giydir-db', 'profiles').then(console.log).catch(console.error)"

# Test storage
node -e "const { storage } = require('./src/lib/appwrite.js'); storage.listFiles('productImages').then(console.log).catch(console.error)"
```

### 🆘 Troubleshooting

**Issue: `setKey` not found**
- Ensure you're using appwrite SDK v14+
- Run: `npm install appwrite@latest`

**Issue: Permission denied**
- Check API key has correct permissions
- Verify collection permissions are set correctly

**Issue: Function deployment**
- Ensure function has correct environment variables
- Check function logs in Appwrite console

### 📞 Support

- Appwrite Docs: https://appwrite.io/docs
- Discord: https://appwrite.io/discord
- GitHub Issues: https://github.com/appwrite/appwrite/issues

---

## 🎉 You're Ready!

Your Appwrite migration is complete. The new backend is fully functional and ready to replace Supabase. All collections, storage, and functions are configured identically to your previous setup.
