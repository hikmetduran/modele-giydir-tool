#!/bin/bash

# Appwrite Permission Setup CLI Script
# Uses Appwrite CLI to set up collection permissions

echo "🔧 Setting up Appwrite database permissions via CLI..."

# Check if Appwrite CLI is available
if ! command -v appwrite &> /dev/null; then
    echo "❌ Appwrite CLI is not installed. Please install it first:"
    echo "npm install -g appwrite-cli"
    exit 1
fi

# Check if API key is set
if [ -z "$APPWRITE_API_KEY" ]; then
    echo "❌ APPWRITE_API_KEY environment variable is required"
    echo "Please set: export APPWRITE_API_KEY=your_api_key_here"
    exit 1
fi

# Load environment variables from .env.local if available
if [ -f .env.local ]; then
    echo "📋 Loading environment variables from .env.local..."
    export $(grep -v '^#' .env.local | xargs)
fi

# Database ID
DATABASE_ID="modele-giydir-db"

# Collection IDs from environment
PROFILES_ID="${NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID:-profiles}"
MODEL_PHOTOS_ID="${NEXT_PUBLIC_APPWRITE_MODEL_PHOTOS_COLLECTION_ID:-modelPhotos}"
PRODUCT_IMAGES_ID="${NEXT_PUBLIC_APPWRITE_PRODUCT_IMAGES_COLLECTION_ID:-productImages}"
TRY_ON_RESULTS_ID="${NEXT_PUBLIC_APPWRITE_TRY_ON_RESULTS_COLLECTION_ID:-tryOnResults}"
WALLETS_ID="${NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID:-wallets}"
CREDIT_TRANSACTIONS_ID="${NEXT_PUBLIC_APPWRITE_CREDIT_TRANSACTIONS_COLLECTION_ID:-creditTransactions}"

echo "📋 Using collection IDs:"
echo "- Profiles: $PROFILES_ID"
echo "- Model Photos: $MODEL_PHOTOS_ID"
echo "- Product Images: $PRODUCT_IMAGES_ID"
echo "- Try On Results: $TRY_ON_RESULTS_ID"
echo "- Wallets: $WALLETS_ID"
echo "- Credit Transactions: $CREDIT_TRANSACTIONS_ID"

# Function to update collection permissions
update_permissions() {
    local collection_id=$1
    local collection_name=$2
    local read_permission=$3
    
    echo ""
    echo "📋 Setting permissions for $collection_name ($collection_id)..."
    
    # Update collection permissions
    appwrite databases update-collection \
        --database-id "$DATABASE_ID" \
        --collection-id "$collection_id" \
        --name "$collection_name" \
        --permissions "[\"read($read_permission)\",\"create(user:id)\",\"update(user:id)\",\"delete(user:id)\"]"
    
    if [ $? -eq 0 ]; then
        echo "✅ $collection_name: Successfully configured"
    else
        echo "❌ $collection_name: Failed to configure"
    fi
}

# Set up user-owned collections (users can read their own data)
echo ""
echo "🔧 Setting up user-owned collections..."
update_permissions "$PROFILES_ID" "Profiles" "user:id"
update_permissions "$PRODUCT_IMAGES_ID" "Product Images" "user:id"
update_permissions "$TRY_ON_RESULTS_ID" "Try On Results" "user:id"
update_permissions "$WALLETS_ID" "Wallets" "user:id"
update_permissions "$CREDIT_TRANSACTIONS_ID" "Credit Transactions" "user:id"

# Set up public read collection (modelPhotos readable by all users)
echo ""
echo "🔧 Setting up public read collection..."
update_permissions "$MODEL_PHOTOS_ID" "Model Photos" "users"

echo ""
echo "🎉 Permission setup complete!"
echo ""
echo "📋 Summary of permissions configured:"
echo "- Profiles: Users can read/write their own data"
echo "- Model Photos: All authenticated users can read, users can manage their own"
echo "- Product Images: Users can read/write their own data"
echo "- Try On Results: Users can read/write their own data"
echo "- Wallets: Users can read/write their own data"
echo "- Credit Transactions: Users can read/write their own data"
echo ""
echo "💡 To verify, visit: http://localhost:3000/debug"
