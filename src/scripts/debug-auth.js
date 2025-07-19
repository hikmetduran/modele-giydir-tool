// Debug script for Appwrite authentication
const { Client, Account } = require('appwrite');

// Configuration
const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = 'modele-giydir';

// Create client
const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

const account = new Account(client);

async function debugAuth() {
    console.log('🔍 Debugging Appwrite Authentication...\n');
    
    try {
        console.log('📍 Endpoint:', APPWRITE_ENDPOINT);
        console.log('📍 Project ID:', APPWRITE_PROJECT_ID);
        
        // Test 1: Check if we can get current user
        console.log('\n1️⃣ Testing current user session...');
        try {
            const user = await account.get();
            console.log('✅ User authenticated:', {
                id: user.$id,
                email: user.email,
                name: user.name
            });
        } catch (error) {
            if (error.code === 401) {
                console.log('ℹ️  No active session - user is anonymous (expected for new visitors)');
            } else {
                console.error('❌ Error getting user:', error.message);
            }
        }
        
        // Test 2: Check if we can create an anonymous session
        console.log('\n2️⃣ Testing anonymous session creation...');
        try {
            const session = await account.createAnonymousSession();
            console.log('✅ Anonymous session created:', session.$id);
            
            // Now test getting the user again
            const anonUser = await account.get();
            console.log('✅ Anonymous user:', {
                id: anonUser.$id,
                email: anonUser.email || 'none',
                name: anonUser.name || 'Anonymous'
            });
            
            // Clean up anonymous session
            await account.deleteSession('current');
            console.log('✅ Anonymous session cleaned up');
            
        } catch (error) {
            console.error('❌ Anonymous session error:', error.message);
        }
        
        console.log('\n🎯 Authentication debug complete!');
        
    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

// Run the debug
debugAuth();
