#!/usr/bin/env node

// Load environment variables from .env.local
import { config } from 'dotenv'
import { join } from 'path'

// Load .env.local file
config({ path: join(process.cwd(), '.env.local') })

import { supabaseServer } from '../lib/supabase'
import { readFileSync, existsSync } from 'fs'

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
}

function colorize(text: string, color: keyof typeof colors): string {
    return `${colors[color]}${text}${colors.reset}`
}

async function testEnvironmentVariables() {
    console.log(colorize('🔍 Testing Environment Variables...', 'yellow'))

    const requiredEnvVars = [
        'NEXT_PUBLIC_FAL_KEY',
        'SUPABASE_SECRET_KEY',
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]

    let allGood = true

    for (const envVar of requiredEnvVars) {
        const value = process.env[envVar]
        if (value) {
            console.log(`  ✅ ${envVar}: ${value.substring(0, 10)}...`)
        } else {
            console.log(`  ❌ ${envVar}: Missing`)
            allGood = false
        }
    }

    return allGood
}

async function testModelPromptsFile() {
    console.log(colorize('📋 Testing Model Prompts File...', 'yellow'))

    const promptsPath = join(process.cwd(), '..', 'resources', 'model-prompts.json')

    if (!existsSync(promptsPath)) {
        console.log(`  ❌ File not found: ${promptsPath}`)
        return false
    }

    try {
        const content = JSON.parse(readFileSync(promptsPath, 'utf8'))

        if (!content.model_photos || !Array.isArray(content.model_photos)) {
            console.log('  ❌ Invalid format: missing model_photos array')
            return false
        }

        console.log(`  ✅ Found ${content.model_photos.length} model prompts`)

        // Validate each model prompt
        for (let i = 0; i < content.model_photos.length; i++) {
            const model = content.model_photos[i]
            const required = ['name', 'description', 'gender', 'prompt']
            const missing = required.filter(field => !model[field])

            if (missing.length > 0) {
                console.log(`  ❌ Model ${i + 1} (${model.name || 'unnamed'}) missing: ${missing.join(', ')}`)
                return false
            } else {
                console.log(`  ✅ Model ${i + 1}: ${model.name} (${model.gender})`)
            }
        }

        return true
    } catch (error) {
        console.log(`  ❌ Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
        return false
    }
}

async function testSupabaseConnection() {
    console.log(colorize('🗄️  Testing Supabase Connection...', 'yellow'))

    try {
        // Test database connection
        const { error } = await supabaseServer
            .from('model_photos')
            .select('id')
            .limit(1)

        if (error) {
            console.log(`  ❌ Database error: ${error.message}`)
            return false
        }

        console.log('  ✅ Database connection successful')

        // Test storage bucket
        const { error: storageError } = await supabaseServer.storage
            .from('model-photos')
            .list('', { limit: 1 })

        if (storageError) {
            console.log(`  ❌ Storage error: ${storageError.message}`)
            return false
        }

        console.log('  ✅ Storage bucket accessible')

        return true
    } catch (error) {
        console.log(`  ❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        return false
    }
}

async function testFalAIKey() {
    console.log(colorize('🎨 Testing FalAI API Key...', 'yellow'))

    const falKey = process.env.NEXT_PUBLIC_FAL_KEY

    if (!falKey) {
        console.log('  ❌ NEXT_PUBLIC_FAL_KEY not found in environment variables')
        return false
    }

    if (falKey.length < 20) {
        console.log('  ❌ NEXT_PUBLIC_FAL_KEY appears to be too short (invalid)')
        return false
    }

    console.log('  ✅ NEXT_PUBLIC_FAL_KEY format looks valid')
    console.log('  ℹ️  Note: Actual API functionality will be tested during generation')

    return true
}

async function main() {
    console.log(colorize('🧪 Model Photo Generator - Setup Test', 'cyan'))
    console.log(colorize('='.repeat(50), 'cyan'))
    console.log()

    const tests = [
        { name: 'Environment Variables', test: testEnvironmentVariables },
        { name: 'Model Prompts File', test: testModelPromptsFile },
        { name: 'Supabase Connection', test: testSupabaseConnection },
        { name: 'FalAI API Key', test: testFalAIKey }
    ]

    let allPassed = true

    for (const { name, test } of tests) {
        try {
            const result = await test()
            if (!result) {
                allPassed = false
            }
            console.log()
        } catch (error) {
            console.log(`  ❌ ${name} test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
            allPassed = false
            console.log()
        }
    }

    console.log(colorize('📊 Test Summary:', 'bright'))
    console.log(colorize('='.repeat(30), 'bright'))

    if (allPassed) {
        console.log(colorize('✅ All tests passed! You can now run the model generator.', 'green'))
        console.log()
        console.log(colorize('Next steps:', 'bright'))
        console.log('  1. Run: npm run generate-models:dry-run')
        console.log('  2. If dry-run looks good, run: npm run generate-models')
        process.exit(0)
    } else {
        console.log(colorize('❌ Some tests failed. Please fix the issues above before running the generator.', 'red'))
        process.exit(1)
    }
}

// Run the test
main().catch(error => {
    console.error(colorize('❌ Test script failed:', 'red'))
    console.error(error)
    process.exit(1)
}) 