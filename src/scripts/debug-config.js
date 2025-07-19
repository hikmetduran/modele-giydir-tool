#!/usr/bin/env node

/**
 * Simple Appwrite Configuration Debug
 * This script checks if all required environment variables and collections exist
 */

console.log('🔍 Appwrite Configuration Debug\n');

// Check environment variables
console.log('1. Environment Variables:');
const requiredEnvVars = [
    'NEXT_PUBLIC_APPWRITE_ENDPOINT',
    'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
    'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
    'NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID',
    'NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID',
    'NEXT_PUBLIC_APPWRITE_MODEL_PHOTOS_COLLECTION_ID',
    'NEXT_PUBLIC_APPWRITE_PRODUCT_IMAGES_COLLECTION_ID',
    'NEXT_PUBLIC_APPWRITE_TRY_ON_RESULTS_COLLECTION_ID',
    'NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID',
    'NEXT_PUBLIC_APPWRITE_CREDIT_TRANSACTIONS_COLLECTION_ID'
];

requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    console.log(`   ${envVar}: ${value ? '✅ Set' : '❌ Missing'}`);
    if (value) {
        console.log(`     Value: ${value}`);
    }
});

console.log('\n2. Configuration Summary:');
console.log(`   Endpoint: ${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'}`);
console.log(`   Project: ${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'modele-giydir'}`);
console.log(`   Database: ${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'modele-giydir-db'}`);
console.log(`   Storage Bucket: ${process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID || 'productImages'}`);

console.log('\n3. Collection IDs:');
const collections = {
    profiles: process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID || 'profiles',
    modelPhotos: process.env.NEXT_PUBLIC_APPWRITE_MODEL_PHOTOS_COLLECTION_ID || 'modelPhotos',
    productImages: process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_IMAGES_COLLECTION_ID || 'productImages',
    tryOnResults: process.env.NEXT_PUBLIC_APPWRITE_TRY_ON_RESULTS_COLLECTION_ID || 'tryOnResults',
    wallets: process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || 'wallets',
    creditTransactions: process.env.NEXT_PUBLIC_APPWRITE_CREDIT_TRANSACTIONS_COLLECTION_ID || 'creditTransactions'
};

Object.entries(collections).forEach(([name, id]) => {
    console.log(`   ${name}: ${id || '❌ Not set'}`);
});

console.log('\n4. Next Steps:');
console.log('   1. Ensure all environment variables are set in .env.local');
console.log('   2. Check Appwrite console for actual collection IDs');
console.log('   3. Verify RLS policies are configured for user access');
console.log('   4. Test with a signed-in user to check permissions');

console.log('\n🔍 Debug complete!');
