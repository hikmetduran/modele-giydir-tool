#!/usr/bin/env node

/**
 * Database Types Synchronization CLI Tool
 * Generates TypeScript types from the actual database schema
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration in .env.local');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ColumnInfo {
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string;
}

async function generateTypes() {
    console.log('🔄 Generating TypeScript types from database schema...\n');

    try {
        // Get all tables
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .in('table_name', [
                'model_photos',
                'product_images',
                'try_on_results',
                'wallets',
                'credit_transactions'
            ]);

        if (tablesError) throw tablesError;

        const tableNames = tables?.map(t => t.table_name) || [];
        const types: string[] = [];

        for (const tableName of tableNames) {
            console.log(`📋 Processing ${tableName}...`);

            const { data: columns, error: columnsError } = await supabase
                .from('information_schema.columns')
                .select('column_name, data_type, is_nullable, column_default')
                .eq('table_schema', 'public')
                .eq('table_name', tableName);

            if (columnsError) {
                console.error(`❌ Error getting columns for ${tableName}:`, columnsError);
                continue;
            }

            const interfaceContent = generateInterface(tableName, columns || []);

            types.push(interfaceContent);
        }

        // Generate the complete types file
        const output = `/**
 * Auto-generated database types from actual schema
 * Generated on: ${new Date().toISOString()}
 */

// Common types
export type Gender = 'male' | 'female' | 'unisex';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type TransactionType = 'deduct' | 'refund' | 'purchase' | 'bonus';

// Timestamp fields
export interface TimestampFields {
  created_at: string;
  updated_at?: string;
}

${types.join('\n\n')}

// Database table union
export type DatabaseTable = 
  | 'model_photos'
  | 'product_images'
  | 'try_on_results'
  | 'wallets'
  | 'credit_transactions';

// All database records
export type DatabaseRecord = 
  | ModelPhoto
  | ProductImage
  | TryOnResult
  | Wallet
  | CreditTransaction;
`;

        const outputPath = path.join(__dirname, '../types/generated.ts');
        fs.writeFileSync(outputPath, output);

        console.log(`✅ Types generated successfully: ${outputPath}`);
        return true;
    } catch (error) {
        console.error('❌ Error generating types:', error);
        return false;
    }
}

function toPascalCase(str: string): string {
    return str
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}

function mapPostgresTypeToTs(pgType: string): string {
    const typeMap: { [key: string]: string } = {
        'uuid': 'string',
        'text': 'string',
        'character varying': 'string',
        'varchar': 'string',
        'integer': 'number',
        'int': 'number',
        'int4': 'number',
        'bigint': 'number',
        'int8': 'number',
        'boolean': 'boolean',
        'bool': 'boolean',
        'timestamp with time zone': 'string',
        'timestamp without time zone': 'string',
        'date': 'string',
        'jsonb': 'Record<string, any>',
        'json': 'Record<string, any>'
    };

    return typeMap[pgType.toLowerCase()] || 'any';
}

function generateInterface(tableName: string, columns: ColumnInfo[]): string {
    const interfaceName = toPascalCase(tableName);
    const properties: string[] = [];

    for (const column of columns) {
        const tsType = mapPostgresTypeToTs(column.data_type);
        const isOptional = column.is_nullable === 'YES' || column.column_default !== null;
        const optionalMarker = isOptional ? '?' : '';

        properties.push(`  ${column.column_name}${optionalMarker}: ${tsType};`);
    }

    return `export interface ${interfaceName} {
${properties.join('\n')}
}`;
}

// Run generation if called directly
if (require.main === module) {
    generateTypes().then(success => {
        process.exit(success ? 0 : 1);
    });
}

export { generateTypes };
