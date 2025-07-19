#!/usr/bin/env node

/**
 * Database Schema Validation CLI Tool
 * Validates that the database schema matches the expected structure
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TableInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string;
}

interface ExpectedSchema {
  [tableName: string]: {
    [columnName: string]: {
      type: string;
      nullable: boolean;
      default?: string;
    };
  };
}

const expectedSchema: ExpectedSchema = {
  model_photos: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    name: { type: 'text', nullable: false },
    description: { type: 'text', nullable: true },
    image_url: { type: 'text', nullable: false },
    image_path: { type: 'text', nullable: false },
    gender: { type: 'text', nullable: true },
    body_type: { type: 'text', nullable: true },
    is_active: { type: 'boolean', nullable: true, default: 'true' },
    sort_order: { type: 'integer', nullable: true, default: '0' },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'now()' }
  },
  product_images: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    user_id: { type: 'uuid', nullable: false },
    original_filename: { type: 'text', nullable: false },
    image_url: { type: 'text', nullable: false },
    image_path: { type: 'text', nullable: false },
    file_size: { type: 'integer', nullable: true },
    mime_type: { type: 'text', nullable: true },
    width: { type: 'integer', nullable: true },
    height: { type: 'integer', nullable: true },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'now()' }
  },
  try_on_results: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    user_id: { type: 'uuid', nullable: false },
    product_image_id: { type: 'uuid', nullable: false },
    model_photo_id: { type: 'uuid', nullable: false },
    result_image_url: { type: 'text', nullable: true },
    result_image_path: { type: 'text', nullable: true },
    status: { type: 'text', nullable: true, default: 'pending' },
    metadata: { type: 'jsonb', nullable: true },
    credits_used: { type: 'integer', nullable: true, default: '10' },
    error_message: { type: 'text', nullable: true },
    processing_started_at: { type: 'timestamp with time zone', nullable: true },
    processing_completed_at: { type: 'timestamp with time zone', nullable: true },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'now()' }
  },
  wallets: {
    user_id: { type: 'uuid', nullable: false },
    credits: { type: 'integer', nullable: false, default: '0' },
    total_earned: { type: 'integer', nullable: false, default: '0' },
    total_spent: { type: 'integer', nullable: false, default: '0' },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'now()' },
    updated_at: { type: 'timestamp with time zone', nullable: true, default: 'now()' }
  },
  credit_transactions: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    user_id: { type: 'uuid', nullable: false },
    type: { type: 'text', nullable: false },
    amount: { type: 'integer', nullable: false },
    credits_before: { type: 'integer', nullable: false },
    credits_after: { type: 'integer', nullable: false },
    description: { type: 'text', nullable: true },
    metadata: { type: 'jsonb', nullable: true },
    related_try_on_id: { type: 'uuid', nullable: true },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'now()' }
  }
};

async function validateSchema() {
  console.log('🔍 Validating database schema...\n');

  try {
    // Get all tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', Object.keys(expectedSchema));

    if (tablesError) throw tablesError;

    const existingTables = tables?.map(t => t.table_name) || [];
    const missingTables = Object.keys(expectedSchema).filter(t => !existingTables.includes(t));

    if (missingTables.length > 0) {
      console.log('❌ Missing tables:');
      missingTables.forEach(table => console.log(`  - ${table}`));
      return false;
    }

    // Validate each table's schema
    let hasErrors = false;

    for (const [tableName, expectedColumns] of Object.entries(expectedSchema)) {
      console.log(`📋 Validating ${tableName}...`);
      
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);

      if (columnsError) {
        console.error(`❌ Error getting columns for ${tableName}:`, columnsError);
        hasErrors = true;
        continue;
      }

      const actualColumns = columns || [];
      
      for (const [columnName, expected] of Object.entries(expectedColumns)) {
        const actual = actualColumns.find(c => c.column_name === columnName);
        
        if (!actual) {
          console.log(`  ❌ Missing column: ${columnName}`);
          hasErrors = true;
          continue;
        }

        // Check data type
        if (actual.data_type !== expected.type) {
          console.log(`  ⚠️  Type mismatch for ${columnName}: expected ${expected.type}, got ${actual.data_type}`);
        }

        // Check nullability
        const isNullable = actual.is_nullable === 'YES';
        if (isNullable !== expected.nullable) {
          console.log(`  ⚠️  Nullability mismatch for ${columnName}: expected ${expected.nullable}, got ${isNullable}`);
        }

        // Check default value
        if (expected.default && actual.column_default !== expected.default) {
          console.log(`  ⚠️  Default mismatch for ${columnName}: expected ${expected.default}, got ${actual.column_default}`);
        }
      }
    }

    if (!hasErrors) {
      console.log('✅ All tables and columns match expected schema!');
    }

    return !hasErrors;
  } catch (error) {
    console.error('❌ Error validating schema:', error);
    return false;
  }
}

// Run validation if called directly
if (require.main === module) {
  validateSchema().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { validateSchema };
