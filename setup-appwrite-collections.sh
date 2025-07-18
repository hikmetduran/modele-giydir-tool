#!/bin/bash

# Appwrite Database Setup Script
# This script creates all collections and attributes based on your Supabase schema

DATABASE_ID="modele-giydir-db"

echo "🚀 Setting up Appwrite collections..."

# Create modelPhotos collection attributes
echo "📸 Setting up modelPhotos collection..."
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id modelPhotos --key id --size 36 --required true
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id modelPhotos --key name --size 255 --required true
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id modelPhotos --key description --size 1000 --required false
appwrite databases create-url-attribute --database-id $DATABASE_ID --collection-id modelPhotos --key image_url --required true
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id modelPhotos --key image_path --size 500 --required true
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id modelPhotos --key gender --size 50 --required false
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id modelPhotos --key body_type --size 50 --required false
appwrite databases create-boolean-attribute --database-id $DATABASE_ID --collection-id modelPhotos --key is_active --required true
appwrite databases create-integer-attribute --database-id $DATABASE_ID --collection-id modelPhotos --key sort_order --min 0 --max 9999 --required true
appwrite databases create-datetime-attribute --database-id $DATABASE_ID --collection-id modelPhotos --key created_at --required true

# Create productImages collection
echo "🖼️ Setting up productImages collection..."
appwrite databases create-collection --database-id $DATABASE_ID --collection-id productImages --name "product_images"
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id productImages --key id --size 36 --required true
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id productImages --key user_id --size 36 --required true
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id productImages --key original_filename --size 255 --required true
appwrite databases create-url-attribute --database-id $DATABASE_ID --collection-id productImages --key image_url --required true
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id productImages --key image_path --size 500 --required true
appwrite databases create-integer-attribute --database-id $DATABASE_ID --collection-id productImages --key file_size --min 0 --max 999999999 --required false
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id productImages --key mime_type --size 100 --required false
appwrite databases create-integer-attribute --database-id $DATABASE_ID --collection-id productImages --key width --min 0 --max 99999 --required false
appwrite databases create-integer-attribute --database-id $DATABASE_ID --collection-id productImages --key height --min 0 --max 99999 --required false
appwrite databases create-datetime-attribute --database-id $DATABASE_ID --collection-id productImages --key created_at --required true

# Create tryOnResults collection
echo "👗 Setting up tryOnResults collection..."
appwrite databases create-collection --database-id $DATABASE_ID --collection-id tryOnResults --name "try_on_results"
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id tryOnResults --key id --size 36 --required true
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id tryOnResults --key user_id --size 36 --required true
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id tryOnResults --key product_image_id --size 36 --required true
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id tryOnResults --key model_photo_id --size 36 --required true
appwrite databases create-url-attribute --database-id $DATABASE_ID --collection-id tryOnResults --key result_image_url --required false
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id tryOnResults --key result_image_path --size 500 --required false
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id tryOnResults --key status --size 50 --required true
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id tryOnResults --key ai_provider --size 100 --required false
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id tryOnResults --key ai_model --size 100 --required false
appwrite databases create-integer-attribute --database-id $DATABASE_ID --collection-id tryOnResults --key processing_time_seconds --min 0 --max 99999 --required false
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id tryOnResults --key error_message --size 1000 --required false
appwrite databases create-object-attribute --database-id $DATABASE_ID --collection-id tryOnResults --key metadata --required false
appwrite databases create-datetime-attribute --database-id $DATABASE_ID --collection-id tryOnResults --key created_at --required true
appwrite databases create-datetime-attribute --database-id $DATABASE_ID --collection-id tryOnResults --key updated_at --required true

# Create wallets collection
echo "💰 Setting up wallets collection..."
appwrite databases create-collection --database-id $DATABASE_ID --collection-id wallets --name "wallets"
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id wallets --key id --size 36 --required true
appwrite databases create-string-attribute --database-id $DATABASE_ID --collection-id wallets --key user_id --size 36 --required true
appwrite databases create-integer-attribute --database-id $DATABASE_ID --collection-id wallets --key credits --min 0 --max 999999 --required true
appwrite databases create-datetime-attribute --database-id $DATABASE
