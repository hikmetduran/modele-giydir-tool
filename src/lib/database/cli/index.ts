#!/usr/bin/env node

/**
 * Database Management CLI Tool
 * Central CLI for managing database schema and types
 */

import { program } from 'commander';
import { validateSchema } from './validate-schema';
import { generateTypes } from './sync-types';
import * as fs from 'fs';
import * as path from 'path';

program
  .name('database-cli')
  .description('Database management CLI for Modele Giydir')
  .version('1.0.0');

program
  .command('validate')
  .description('Validate database schema against expected structure')
  .action(async () => {
    console.log('🔍 Starting schema validation...\n');
    const success = await validateSchema();
    process.exit(success ? 0 : 1);
  });

program
  .command('sync-types')
  .description('Generate TypeScript types from actual database schema')
  .action(async () => {
    console.log('🔄 Starting type synchronization...\n');
    const success = await generateTypes();
    process.exit(success ? 0 : 1);
  });

program
  .command('setup')
  .description('Run complete database setup (schema + validation)')
  .action(async () => {
    console.log('🚀 Starting complete database setup...\n');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, '../sql/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Schema file not found:', schemaPath);
      process.exit(1);
    }

    console.log('📋 Schema file found:', schemaPath);
    console.log('⚠️  Please run the schema manually in Supabase SQL editor');
    console.log('   File location:', schemaPath);
    
    // Validate after setup
    console.log('\n🔍 Validating schema...');
    const success = await validateSchema();
    process.exit(success ? 0 : 1);
  });

program
  .command('info')
  .description('Show database structure information')
  .action(() => {
    console.log('📊 Database Structure Information');
    console.log('================================\n');
    
    console.log('Tables:');
    console.log('  - model_photos: AI-generated model images');
    console.log('  - product_images: User-uploaded clothing images');
    console.log('  - try_on_results: AI try-on processing results');
    console.log('  - wallets: User credit balances');
    console.log('  - credit_transactions: Credit change history\n');
    
    console.log('CLI Commands:');
    console.log('  npm run db:validate    - Validate schema');
    console.log('  npm run db:sync-types  - Sync TypeScript types');
    console.log('  npm run db:setup       - Complete setup');
    console.log('  npm run db:info        - Show this info');
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error('❌ Invalid command: %s\n', program.args.join(' '));
  program.help();
});

// Parse CLI arguments
program.parse();

// Export for programmatic use
export { validateSchema, generateTypes };
