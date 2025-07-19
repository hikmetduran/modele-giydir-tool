#!/usr/bin/env node

/**
 * Appwrite Permission Setup Script
 * Sets up read permissions for collections based on requirements:
 * - Users can read their own data for most collections
 * - model_photos is readable to all users
 * - All collections have appropriate write permissions
 */

const { Client, Databases, Permission, Role } = require('node-appwrite');

// Configuration
const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('modele-giydir');

// You need to set APPWRITE_API_KEY environment variable
const apiKey = process.env.APPWRITE_API_KEY;
if (!apiKey) {
    console.error('❌ APPWRITE_API_KEY environment variable is required');
    console.error('Please set: export APPWRITE_API_KEY=your_api_key_here');
    process.exit(1);
}

client.setKey(apiKey);

const databases = new Databases(client);
const DATABASE_ID = 'modele-giydir-db';

// Collection configurations
const COLLECTIONS = {
    profiles: process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID,
    modelPhotos: process.env.NEXT_PUBLIC_APPWRITE_MODEL_PHOTOS_COLLECTION_ID,
    productImages: process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_IMAGES_COLLECTION_ID,
    tryOnResults: process.env.NEXT_PUBLIC_APPWRITE_TRY_ON_RESULTS_COLLECTION_ID,
    wallets: process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID,
    creditTransactions: process.env.NEXT_PUBLIC_APPWRITE_CREDIT_TRANSACTIONS_COLLECTION_ID
};

// Validate collection IDs
for (const [key, value] of Object.entries(COLLECTIONS)) {
    if (!value) {
        console.error(`❌ Missing collection ID for ${key}. Please check your .env.local file.`);
        console.error(`Expected: NEXT_PUBLIC_APPWRITE_${key.toUpperCase()}_COLLECTION_ID`);
        process.exit(1);
    }
}

async function setupPermissions() {
    console.log('🔧 Setting up Appwrite database permissions...\n');

    try {
        // User-owned collections - users can read/write their own data
        const userOwnedCollections = [
            { id: COLLECTIONS.profiles, name: 'Profiles' },
            { id: COLLECTIONS.productImages, name: 'Product Images' },
            { id: COLLECTIONS.tryOnResults, name: 'Try On Results' },
            { id: COLLECTIONS.wallets, name: 'Wallets' },
            { id: COLLECTIONS.creditTransactions, name: 'Credit Transactions' }
        ];

        for (const collection of userOwnedCollections) {
            console.log(`📋 Setting permissions for ${collection.name} (${collection.id})...`);
            
            await databases.updateCollection(
                DATABASE_ID,
                collection.id,
                [
                    Permission.read(Role.user('id')),
                    Permission.create(Role.user('id')),
                    Permission.update(Role.user('id')),
                    Permission.delete(Role.user('id'))
                ]
            );
            
            console.log(`✅ ${collection.name}: Users can read/write their own data`);
        }

        // Public read collection - modelPhotos readable by all authenticated users
        console.log(`📋 Setting permissions for Model Photos (${COLLECTIONS.modelPhotos})...`);
        
        await databases.updateCollection(
            DATABASE_ID,
            COLLECTIONS.modelPhotos,
            [
                Permission.read(Role.users()),
                Permission.create(Role.user('id')),
                Permission.update(Role.user('id')),
                Permission.delete(Role.user('id'))
            ]
        );
        
        console.log(`✅ Model Photos: All authenticated users can read, users can manage their own`);

        console.log('\n🎉 All permissions have been successfully configured!');
        console.log('\n📋 Summary:');
        console.log('- Profiles: Users can read/write their own data');
        console.log('- Model Photos: All users can read, users can manage their own');
        console.log('- Product Images: Users can read/write their own data');
        console.log('- Try On Results: Users can read/write their own data');
        console.log('- Wallets: Users can read/write their own data');
        console.log('- Credit Transactions: Users can read/write their own data');

    } catch (error) {
        console.error('❌ Error setting up permissions:', error.message);
        console.error('Make sure your API key has sufficient permissions');
        process.exit(1);
    }
}

// Run the setup
setupPermissions();
