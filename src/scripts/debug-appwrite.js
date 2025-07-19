#!/usr/bin/env node

/**
 * Appwrite Debug Script - Client-Side Compatible
 * This script helps debug Appwrite configuration using client-side methods
 */

const { Client, Databases, Storage, Account, Query } = require('appwrite');

// Configuration
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'modele-giydir';
const APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'modele-giydir-db';

// Collection IDs
const COLLECTIONS = {
    profiles: process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID || 'profiles',
    modelPhotos: process.env.NEXT_PUBLIC_APPWRITE_MODEL_PHOTOS_COLLECTION_ID || 'modelPhotos',
    productImages: process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_IMAGES_COLLECTION_ID || 'productImages',
    tryOnResults: process.env.NEXT_PUBLIC_APPWRITE_TRY_ON_RESULTS_COLLECTION_ID || 'tryOnResults',
    wallets: process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || 'wallets',
    creditTransactions: process.env.NEXT_PUBLIC_APPWRITE_CREDIT_TRANSACTIONS_COLLECTION_ID || 'creditTransactions',
};

const STORAGE_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID || 'productImages';

// Initialize clients
const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

const databases = new Databases(client);
const storage = new Storage(client);
const account = new Account(client);

async function debugAppwrite() {
    console.log('🔍 Starting Appwrite Debug...\n');

    try {
        // Test authentication
        console.log('1. Testing Authentication...');
        try {
            const user = await account.get();
            console.log('✅ User authenticated:', user.$id);
        } catch (error) {
            console.log('❌ Not authenticated:', error.message);
            console.log('   This is expected if you haven\'t signed in yet');
        }

        // Test database connection by listing documents
        console.log('\n2. Testing Database Collections...');
        for (const [key, collectionId] of Object.entries(COLLECTIONS)) {
            try {
                const docs = await databases.listDocuments(
                    APPWRITE_DATABASE_ID,
                    collectionId,
                    [Query.limit(1)]
                );
                console.log(`✅ ${key}: Accessible (${docs.total} records)`);
            } catch (error) {
                console.log(`❌ ${key}: ${error.message}`);
            }
        }

        // Test storage connection
        console.log('\n3. Testing Storage Connection...');
        try {
            const bucket = await storage.getBucket(STORAGE_BUCKET_ID);
            console.log('✅ Storage bucket accessible:', bucket.name);
        } catch (error) {
            console.log('❌ Storage error:', error.message);
        }

        // Test storage files
        console.log('\n4. Testing Storage Files...');
        try {
            const files = await storage.listFiles(STORAGE_BUCKET_ID);
            console.log(`✅ Files found: ${files.total}`);
        } catch (error) {
            console.log('❌ Storage files error:', error.message);
        }

        // Test basic queries
        console.log('\n5. Testing Basic Queries...');
        try {
            const testQueries = [
                { collection: COLLECTIONS.profiles, name: 'profiles' },
                { collection: COLLECTIONS.wallets, name: 'wallets' }
            ];

            for (const { collection, name } of testQueries) {
                try {
                    const docs = await databases.listDocuments(
                        APPWRITE_DATABASE_ID,
                        collection,
                        [Query.limit(0)]
                    );
                    console.log(`✅ ${name}: Query works (${docs.total} total)`);
                } catch (error) {
                    console.log(`❌ ${name}: ${error.message}`);
                }
            }
        } catch (error) {
            console.log('❌ Query test error:', error.message);
        }

    } catch (error) {
        console.error('❌ Debug script error:', error);
    }

    console.log('\n🔍 Debug complete!');
    console.log('\n💡 Next steps:');
    console.log('1. Sign in to the application to test authenticated access');
    console.log('2. Try uploading an image to test storage');
    console.log('3. Check if wallet and profile are created automatically');
}

// Run debug if called directly
if (require.main === module) {
    debugAppwrite();
}

module.exports = { debugAppwrite };
