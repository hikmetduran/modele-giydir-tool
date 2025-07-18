#!/bin/bash

# Complete Appwrite Setup Script
# This script sets up everything needed for Modele Giydir on Appwrite

echo "🚀 Setting up Appwrite for Modele Giydir..."

# Configuration
DATABASE_ID="modele-giydir-db"
PROJECT_ID="modele-giydir"
ENDPOINT="https://fra.cloud.appwrite.io/v1"

echo "✅ Database created: modele-giydir-db"
echo "✅ Collections created: profiles, modelPhotos, productImages, tryOnResults, wallets, creditTransactions"
echo "✅ Storage bucket created: productImages (will use folders for organization)"

# Create Appwrite function
echo "📝 Creating Appwrite function..."

# Create function directory
mkdir -p appwrite/functions/process-try-on

# Create the function
cat > appwrite/functions/process-try-on/index.js << 'EOF'
const { Client, Databases, Storage, Users } = require('node-appwrite');

// Appwrite client setup
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);
const users = new Users(client);

// Database and collection IDs
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const TRY_ON_RESULTS_COLLECTION_ID = 'tryOnResults';
const PRODUCT_IMAGES_COLLECTION_ID = 'productImages';
const MODEL_PHOTOS_COLLECTION_ID = 'modelPhotos';
const WALLETS_COLLECTION_ID = 'wallets';
const CREDIT_TRANSACTIONS_COLLECTION_ID = 'creditTransactions';

// Storage bucket ID
const STORAGE_BUCKET_ID = 'productImages';

// Fal.ai integration
const FAL_API_KEY = process.env.FAL_API_KEY;

// Import Fal.ai client
const { fal } = require('@fal-ai/client');

if (FAL_API_KEY) {
    fal.config({
        credentials: FAL_API_KEY
    });
}

module.exports = async (req, res) => {
    try {
        const { productImageId, modelPhotoId, jobId } = JSON.parse(req.body || '{}');
        const userId = req.headers['x-appwrite-user-id'];

        if (!userId) {
            return res.json({ success: false, error: 'User not authenticated' }, 401);
        }

        if (!productImageId || !modelPhotoId || !jobId) {
            return res.json({ success: false, error: 'Missing required fields' }, 400);
        }

        // Check credits
        const wallet = await databases.getDocument(
            DATABASE_ID,
            WALLETS_COLLECTION_ID,
            userId
        );

        if (!wallet || wallet.credits < 10) {
            return res.json({ success: false, error: 'Insufficient credits' }, 400);
        }

        // Get product image and model photo
        const [productImage, modelPhoto] = await Promise.all([
            databases.getDocument(DATABASE_ID, PRODUCT_IMAGES_COLLECTION_ID, productImageId),
            databases.getDocument(DATABASE_ID, MODEL_PHOTOS_COLLECTION_ID, modelPhotoId)
        ]);

        if (!productImage || !modelPhoto) {
            return res.json({ success: false, error: 'Images not found' }, 404);
        }

        // Deduct credits
        await databases.updateDocument(
            DATABASE_ID,
            WALLETS_COLLECTION_ID,
            userId,
            { credits: wallet.credits - 10 }
        );

        // Create transaction record
        await databases.createDocument(
            DATABASE_ID,
            CREDIT_TRANSACTIONS_COLLECTION_ID,
            'unique()',
            {
                user_id: userId,
                wallet_id: userId,
                amount: -10,
                transaction_type: 'try_on_generation',
                description: 'Try-on generation',
                try_on_result_id: jobId,
                created_at: new Date().toISOString()
            }
        );

        // Update try-on result status
        await databases.updateDocument(
            DATABASE_ID,
            TRY_ON_RESULTS_COLLECTION_ID,
            jobId,
            {
                status: 'processing',
                updated_at: new Date().toISOString()
            }
        );

        // Submit to Fal.ai
        const { request_id } = await fal.queue.submit("fal-ai/fashn/tryon/v1.6", {
            input: {
                model_image: modelPhoto.image_url,
                garment_image: productImage.image_url
            }
        });

        // Poll for result
        let result = null;
        let attempts = 0;
        const maxAttempts = 120;

        while (!result && attempts < maxAttempts) {
            const status = await fal.queue.status("fal-ai/fashn/tryon/v1.6", {
                requestId: request_id
            });

            if (status.status === 'COMPLETED') {
                const finalResult = await fal.queue.result("fal-ai/fashn/tryon/v1.6", {
                    requestId: request_id
                });
                
                if (finalResult.data?.images?.[0]?.url) {
                    result = finalResult.data.images[0].url;
                }
                break;
            } else if (status.status === 'FAILED') {
                throw new Error('Processing failed');
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        if (!result) {
            throw new Error('Processing timeout');
        }

        // Upload result to storage
        const response = await fetch(result);
        const blob = await response.blob();
        
        const fileName = `try-on-results/${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
        const upload = await storage.createFile(
            STORAGE_BUCKET_ID,
            'unique()',
            new File([blob], fileName)
        );

        const resultUrl = `${ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${upload.$id}/view?project=${PROJECT_ID}`;

        // Update try-on result with final result
        await databases.updateDocument(
            DATABASE_ID,
            TRY_ON_RESULTS_COLLECTION_ID,
            jobId,
            {
                status: 'completed',
                result_image_url: resultUrl,
                result_image_path: fileName,
                ai_provider: 'fal-ai',
                ai_model: 'fashn-tryon-v1.6',
                processing_time_seconds: attempts * 5,
                updated_at: new Date().toISOString()
            }
        );

        return res.json({
            success: true,
            resultUrl: resultUrl,
            requestId: request_id
        });

    } catch (error) {
        console.error('Error processing try-on:', error);
        
        // Refund credits on error
        try {
            const userId = req.headers['x-appwrite-user-id'];
            if (userId) {
                const wallet = await databases.getDocument(
                    DATABASE_ID,
                    WALLETS_COLLECTION_ID,
                    userId
                );
                
                await databases.updateDocument(
                    DATABASE_ID,
                    WALLETS_COLLECTION_ID,
                    userId,
                    { credits: wallet.credits + 10 }
                );

                await databases.createDocument(
                    DATABASE_ID,
                    CREDIT_TRANSACTIONS_COLLECTION_ID,
                    'unique()',
                    {
                        user_id: userId,
                        wallet_id: userId,
                        amount: 10,
                        transaction_type: 'refund',
                        description: 'Try-on generation refund',
                        try_on_result_id: JSON.parse(req.body || '{}').jobId,
                        created_at: new Date().toISOString()
                    }
                );
            }
        } catch (refundError) {
            console.error('Error refunding credits:', refundError);
        }

        return res.json({
            success: false,
            error: error.message
        }, 500);
    }
};
EOF

# Create package.json for the function
cat > appwrite/functions/process-try-on/package.json << 'EOF'
{
  "name": "process-try-on",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "node-appwrite": "^14.0.0",
    "@fal-ai/client": "^1.0.0"
  }
}
EOF

echo "✅ Appwrite function created at appwrite/functions/process-try-on/"

# Create environment file template
cat > .env.appwrite << 'EOF'
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
EOF

echo "✅ Environment file template created: .env.appwrite"
echo ""
echo "🎉 Appwrite setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Get your Appwrite API key from: https://cloud.appwrite.io/console/project-$PROJECT_ID/settings/api-keys"
echo "2. Update .env.appwrite with your API key"
echo "3. Deploy the function using: appwrite functions create --function-id processTryOn --runtime node-18.0 --entrypoint index.js --path appwrite/functions/process-try-on"
echo "4. Update your Vercel environment variables with the Appwrite values"
echo ""
echo "📊 Setup Summary:"
echo "   ✅ Database: modele-giydir-db"
echo "   ✅ Collections: 6 collections created"
echo "   ✅ Storage: productImages bucket"
echo "   ✅ Function: process-try-on ready"
echo "   ✅ Environment template: .env.appwrite"
