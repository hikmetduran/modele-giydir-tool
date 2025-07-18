// Appwrite Configuration
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'modele-giydir';
const APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'modele-giydir-db';

// Collection IDs
export const COLLECTIONS = {
    profiles: process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID || 'profiles',
    modelPhotos: process.env.NEXT_PUBLIC_APPWRITE_MODEL_PHOTOS_COLLECTION_ID || 'modelPhotos',
    productImages: process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_IMAGES_COLLECTION_ID || 'productImages',
    tryOnResults: process.env.NEXT_PUBLIC_APPWRITE_TRY_ON_RESULTS_COLLECTION_ID || 'tryOnResults',
    wallets: process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || 'wallets',
    creditTransactions: process.env.NEXT_PUBLIC_APPWRITE_CREDIT_TRANSACTIONS_COLLECTION_ID || 'creditTransactions',
};

// Storage bucket ID
export const STORAGE_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID || 'productImages';

// Function ID
export const PROCESS_TRY_ON_FUNCTION_ID = 'processTryOn';

// Import Appwrite SDK
import { Client, Account, Databases, Storage, Functions, Query } from 'appwrite';

// Client setup
export const appwriteClient = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

// Browser client (for client-side operations)
export const account = new Account(appwriteClient);
export const databases = new Databases(appwriteClient);
export const storage = new Storage(appwriteClient);
export const functions = new Functions(appwriteClient);

// Server client factory (for server-side operations)
export function createAppwriteServerClient() {
    const apiKey = process.env.APPWRITE_API_KEY;
    if (!apiKey) {
        throw new Error('APPWRITE_API_KEY is required for server-side operations');
    }

    const client = new Client()
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID)
        .setKey(apiKey);

    return {
        databases: new Databases(client),
        storage: new Storage(client),
        functions: new Functions(client),
    };
}

// Helper functions (migrated from Supabase)

export async function getAuthUser() {
    try {
        const user = await account.get();
        return { user, error: null };
    } catch (error) {
        return { user: null, error };
    }
}

export async function getUserProfile(userId) {
    try {
        const document = await databases.getDocument(
            APPWRITE_DATABASE_ID,
            COLLECTIONS.profiles,
            userId
        );
        return { data: document, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

export async function getUserWallet(userId) {
    try {
        const document = await databases.getDocument(
            APPWRITE_DATABASE_ID,
            COLLECTIONS.wallets,
            userId
        );
        return { data: document, error: null };
    } catch (error) {
        // Create wallet if it doesn't exist
        if (error.code === 404) {
            try {
                const newWallet = await databases.createDocument(
                    APPWRITE_DATABASE_ID,
                    COLLECTIONS.wallets,
                    userId,
                    {
                        user_id: userId,
                        credits: 100,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                );
                return { data: newWallet, error: null };
            } catch (createError) {
                return { data: null, error: createError };
            }
        }
        return { data: null, error };
    }
}

export async function deductCredits(
    userId,
    amount,
    description = 'Try-on generation',
    tryOnResultId
) {
    try {
        const wallet = await getUserWallet(userId);
        if (!wallet.data || wallet.data.credits < amount) {
            return { success: false, error: { message: 'Insufficient credits' } };
        }

        const newCredits = wallet.data.credits - amount;
        await databases.updateDocument(
            APPWRITE_DATABASE_ID,
            COLLECTIONS.wallets,
            userId,
            { credits: newCredits, updated_at: new Date().toISOString() }
        );

        await databases.createDocument(
            APPWRITE_DATABASE_ID,
            COLLECTIONS.creditTransactions,
            'unique()',
            {
                user_id: userId,
                wallet_id: userId,
                amount: -amount,
                transaction_type: 'try_on_generation',
                description,
                try_on_result_id: tryOnResultId,
                created_at: new Date().toISOString()
            }
        );

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error };
    }
}

export async function refundCredits(
    userId,
    amount,
    description = 'Try-on generation refund',
    tryOnResultId
) {
    try {
        const wallet = await getUserWallet(userId);
        const newCredits = (wallet.data?.credits || 0) + amount;
        
        await databases.updateDocument(
            APPWRITE_DATABASE_ID,
            COLLECTIONS.wallets,
            userId,
            { credits: newCredits, updated_at: new Date().toISOString() }
        );

        await databases.createDocument(
            APPWRITE_DATABASE_ID,
            COLLECTIONS.creditTransactions,
            'unique()',
            {
                user_id: userId,
                wallet_id: userId,
                amount: amount,
                transaction_type: 'refund',
                description,
                try_on_result_id: tryOnResultId,
                created_at: new Date().toISOString()
            }
        );

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error };
    }
}

export async function getCreditTransactions(userId) {
    try {
        const response = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            COLLECTIONS.creditTransactions,
            [
                Query.equal('user_id', userId),
                Query.orderDesc('created_at')
            ]
        );
        return { data: response.documents, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

// Export types for backward compatibility
export const Database = {
    public: {
        Tables: {
            profiles: {},
            model_photos: {},
            product_images: {},
            try_on_results: {},
            wallets: {},
            credit_transactions: {}
        }
    }
};
