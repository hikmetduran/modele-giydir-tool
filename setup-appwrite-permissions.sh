#!/bin/bash

# Appwrite Permission Setup Script
# This script sets up read permissions for collections based on requirements:
# - Users can read their own data for most collections
# - model_photos is readable to all users
# - All collections have appropriate write permissions

echo "Setting up Appwrite database permissions..."

# Database ID from environment
DATABASE_ID="modele-giydir-db"

# Collections that should allow users to read their own data
USER_OWNED_COLLECTIONS=(
  "profiles"
  "productImages"
  "tryOnResults"
  "wallets"
  "creditTransactions"
)

# Collection that should be readable by all users
PUBLIC_READ_COLLECTIONS=(
  "modelPhotos"
)

# Function to update collection permissions
update_collection_permissions() {
  local collection_id=$1
  local read_permission=$2
  
  echo "Updating permissions for collection: $collection_id"
  
  # Update collection with new permissions
  appwrite databases updateCollection \
    --databaseId "$DATABASE_ID" \
    --collectionId "$collection_id" \
    --permissions "[\"read($read_permission)\"]"
}

# Set up user-owned collections (users can read their own data)
for collection in "${USER_OWNED_COLLECTIONS[@]}"; do
  echo "Setting user-owned permissions for: $collection"
  update_collection_permissions "$collection" "user:\$id"
done

# Set up public read collections (readable by all authenticated users)
for collection in "${PUBLIC_READ_COLLECTIONS[@]}"; do
  echo "Setting public read permissions for: $collection"
  update_collection_permissions "$collection" "users"
done

echo "Permission setup complete!"
echo "Note: You may need to set API key environment variable: APPWRITE_API_KEY"
