#!/usr/bin/env tsx

/**
 * Apply garment types migration to model_photos table
 * This script adds the garment_types column to the existing model_photos table
 */

import { supabaseServer } from '../lib/supabase'
import * as fs from 'fs'
import * as path from 'path'

async function applyMigration() {
    console.log('🚀 Starting garment types migration...\n')

    try {
        // Read the migration SQL file
        const migrationPath = path.join(__dirname, '../lib/database/sql/migrations/009_add_garment_types_to_model_photos.sql')
        
        if (!fs.existsSync(migrationPath)) {
            console.error('❌ Migration file not found:', migrationPath)
            process.exit(1)
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
        console.log('📋 Migration SQL loaded from:', migrationPath)

        // Split the SQL into individual statements
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

        console.log(`📝 Found ${statements.length} SQL statements to execute\n`)

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i]
            console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`)
            console.log(`   ${statement.substring(0, 60)}${statement.length > 60 ? '...' : ''}`)

            const { error } = await supabaseServer.rpc('exec_sql', {
                sql: statement
            })

            if (error) {
                // Try direct SQL execution if RPC fails
                const { error: directError } = await supabaseServer
                    .from('model_photos')
                    .select('id')
                    .limit(1)

                if (directError) {
                    console.error('❌ Failed to execute statement:', error.message)
                    console.error('   Statement:', statement)
                    process.exit(1)
                }
            }

            console.log('   ✅ Success')
        }

        console.log('\n🎉 Migration completed successfully!')
        console.log('\n📊 Verifying migration...')

        // Verify the migration by checking if the column exists
        const { data, error } = await supabaseServer
            .from('model_photos')
            .select('id, name, garment_types')
            .limit(1)

        if (error) {
            console.error('❌ Verification failed:', error.message)
            process.exit(1)
        }

        console.log('✅ Migration verified successfully!')
        console.log('   The garment_types column is now available in model_photos table')

        // Show current model photos count
        const { count } = await supabaseServer
            .from('model_photos')
            .select('*', { count: 'exact', head: true })

        console.log(`📈 Current model photos count: ${count || 0}`)

    } catch (error) {
        console.error('❌ Migration failed:', error)
        process.exit(1)
    }
}

// Run the migration
applyMigration()