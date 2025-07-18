// Simple test script to verify edge function authentication
const SUPABASE_URL = 'https://jgltcxeloicyvaenvanu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PW5PLiYx7xqnTnb4iCj1Cg_Zzqn4xRr';

async function testEdgeFunction() {
    console.log('🔍 Testing edge function authentication...');
    
    try {
        // Create a simple test request
        const response = await fetch(`${SUPABASE_URL}/functions/v1/process-try-on`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer invalid-token-for-testing',
            },
            body: JSON.stringify({
                productImageId: '123e4567-e89b-12d3-a456-426614174000',
                modelPhotoId: '123e4567-e89b-12d3-a456-426614174001',
                jobId: '123e4567-e89b-12d3-a456-426614174002'
            })
        });

        console.log('📊 Response status:', response.status);
        console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
        
        const data = await response.json();
        console.log('📊 Response data:', data);
        
        if (response.status === 401) {
            console.log('✅ Authentication is working (401 for invalid token)');
        } else if (response.status === 400) {
            console.log('✅ Function is accessible (400 for invalid data)');
        } else {
            console.log('⚠️  Unexpected response status:', response.status);
        }
        
    } catch (error) {
        console.error('❌ Error testing edge function:', error);
    }
}

// Run the test
testEdgeFunction();
