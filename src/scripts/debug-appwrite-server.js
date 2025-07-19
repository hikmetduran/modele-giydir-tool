#!/usr/bin/env node

/**
 * Appwrite Debug Script - Server-Side with API Key
 * This script uses server-side API key for debugging
 */

const { Client, Databases, Storage, Account, Query } = require('appwrite');

// Configuration
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'modele-giydir';
const APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'modele-giydir-db';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

if (!APPWRITE_API_KEY) {
    console.error('❌ APPWRITE_API_KEY is required for server-side debugging');
    console.log('💡 Add APPWRITE_API_KEY to your .env.local file');
    process.exit(1);
}

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

// Initialize server client
const client = new Client();
client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

async function debugAppwriteServer() {
    console.log('🔍 Starting Appwrite Server-Side Debug...\n');

    try {
        // Test database connection
        console.log('1. Testing Database Connection...');
        try {
            const collections = await databases.listCollections(APPWRITE_DATABASE_ID);
            console.log('✅ Database accessible');
            console.log('📊 Collections found:', collections.collections.length);
            collections.collections.forEach(c => {
                console.log(`   - ${c.name} (${c.$id})`);
            });
        } catch (error) {
            console.log('❌ Database error:', error.message);
        }

        // Test storage connection
        console.log('\n2. Testing Storage Connection...');
        try {
            const bucket = await storage.getBucket(STORAGE_BUCKET_ID);
            console.log('✅ Storage bucket accessible:', bucket.name);
            console.log('📊 Bucket ID:', bucket.$id);
            console.log('📊 File count:', bucket.fileCount);
        } catch (error) {
            console.log('❌ Storage error:', error.message);
        }

        // Test collections and attributes
        console.log('\n3. Testing Collections and Attributes...');
        for (const [key, collectionId] of Object.entries(COLLECTIONS)) {
            try {
                const collection = await databases.getCollection(APPWRITE_DATABASE_ID, collectionId);
                console.log(`✅ ${key}: ${collection.name} (${collection.$id})`);
                
                // List attributes
                const attributes = await databases.listAttributes(APPWRITE_DATABASE_ID, collectionId);
                console.log(`   Attributes: ${attributes.attributes.length}`);
                attributes.attributes.forEach(attr => {
                    console.log(`     - ${attr.key}: ${attr.type}${attr.required ? ' (required)' : ''}`);
                });
                
                // Test document count
                try {
                    const docs = await databases.listDocuments(
                        APPWRITE_DATABASE_ID,
                        collectionId,
                        [Query.limit(1)]
                    );
                    console.log(`   Records: ${docs.total}`);
                } catch (queryError) {
                    console.log(`   Query error: ${queryError.message}`);
                }
            } catch (error) {
                console.log(`❌ ${key}: ${error.message}`);
            }
        }

        // Test storage files
        console.log('\n4. Testing Storage Files...');
        try {
            const files = await storage.listFiles(STORAGE_BUCKET_ID);
            console.log(`✅ Files found: ${files.total}`);
            if (files.files.length > 0) {
                console.log('📊 Sample files:');
                files.files.slice(0, 3).forEach(file => {
                    console.log(`   - ${file.name} (${file.$id})`);
                });
            }
        } catch (error) {
            console.log('❌ Storage files error:', error.message);
        }

        // Test RLS policies by checking permissions
        console.log('\n5. Testing Collection Permissions...');
        for (const [key, collectionId] of Object.entries(COLLECTIONS)) {
            try {
                const collection = await databases.getCollection(APPWRITE_DATABASE_ID, collectionId);
                console.log(`✅ ${key}: Permissions configured`);
                console.log(`   - Read: ${collection.$permissions.read.join(', ')}`);
                console.log(`   - Write: ${collection.$permissions.write.join(', ')}`);
            } catch (error) {
                console.log(`❌ ${key}: ${error.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Debug script error:', error);
    }

    console.log('\n🔍 Server-side debug complete!');
}

// Run debug if called directly
if (require.main === module) {
    debugAppwriteServer();
}

module.exports = { debugAppwriteServer };
