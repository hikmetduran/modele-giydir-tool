#!/usr/bin/env node

// Load environment variables from .env.local
import { config } from 'dotenv'
import { join } from 'path'

// Load .env.local file
config({ path: join(process.cwd(), '.env.local') })

// import { execSync } from 'child_process'
import { existsSync } from 'fs'

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
}

function colorize(text: string, color: keyof typeof colors): string {
    return `${colors[color]}${text}${colors.reset}`
}

function printHeader() {
    console.log(colorize('🎨 Model Photo Generator', 'cyan'))
    console.log(colorize('='.repeat(50), 'cyan'))
    console.log()
}

function checkEnvironment() {
    console.log(colorize('🔍 Checking environment...', 'yellow'))

    const requiredEnvVars = [
        'NEXT_PUBLIC_FAL_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]

    const missing = requiredEnvVars.filter(key => !process.env[key])

    if (missing.length > 0) {
        console.error(colorize(`❌ Missing environment variables: ${missing.join(', ')}`, 'red'))
        console.error(colorize('Please set these in your environment or .env file', 'red'))
        process.exit(1)
    }

    console.log(colorize('✅ Environment check passed', 'green'))
}

function checkModelPrompts() {
    console.log(colorize('📋 Checking model prompts file...', 'yellow'))

    const promptsPath = join(process.cwd(), '..', 'resources', 'model-prompts.json')

    if (!existsSync(promptsPath)) {
        console.error(colorize(`❌ Model prompts file not found: ${promptsPath}`, 'red'))
        console.error(colorize('Please ensure the file exists and contains valid JSON', 'red'))
        process.exit(1)
    }

    try {
        const fs = require('fs')
        const content = JSON.parse(fs.readFileSync(promptsPath, 'utf8'))
        if (!content.model_photos || !Array.isArray(content.model_photos)) {
            throw new Error('Invalid format: missing model_photos array')
        }

        console.log(colorize(`✅ Found ${content.model_photos.length} model prompts`, 'green'))
    } catch (error) {
        console.error(colorize(`❌ Invalid model prompts file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red'))
        process.exit(1)
    }
}

function printUsage() {
    console.log(colorize('Usage:', 'bright'))
    console.log('  npm run generate-models     # Generate all model photos')
    console.log('  npm run generate-models --dry-run  # Show what would be generated without actually generating')
    console.log()
    console.log(colorize('Options:', 'bright'))
    console.log('  --dry-run    Show what would be generated without actually generating')
    console.log('  --help       Show this help message')
    console.log()
}

async function runGenerator() {
    try {
        printHeader()

        // Check for help flag
        if (process.argv.includes('--help') || process.argv.includes('-h')) {
            printUsage()
            process.exit(0)
        }

        // Check environment and files
        checkEnvironment()
        checkModelPrompts()

        console.log(colorize('🚀 Starting model photo generation...', 'green'))
        console.log()

        // Check for dry run
        const isDryRun = process.argv.includes('--dry-run')

        if (isDryRun) {
            console.log(colorize('🔍 DRY RUN MODE - No images will be generated', 'yellow'))
            console.log()

            // Load and display what would be generated
            const promptsPath = join(process.cwd(), '..', 'resources', 'model-prompts.json')
            const fs = require('fs')
            const content = JSON.parse(fs.readFileSync(promptsPath, 'utf8'))

            console.log(colorize('Models that would be processed:', 'bright'))
            content.model_photos.forEach((model: { name: string; gender: string; description: string }, index: number) => {
                console.log(`  ${index + 1}. ${colorize(model.name, 'cyan')} (${model.gender})`)
                console.log(`     ${model.description}`)
            })

            console.log()
            console.log(colorize('Run without --dry-run to actually generate images', 'yellow'))
            process.exit(0)
        }

        // Import and run the generator
        const { ModelPhotoGenerator } = await import('./generate-model-photos')

        const generator = new ModelPhotoGenerator()
        const results = await generator.generateAllModels()
        generator.printSummary(results)

        const failedCount = results.filter(r => !r.success).length

        if (failedCount > 0) {
            console.log()
            console.log(colorize(`❌ ${failedCount} models failed to generate`, 'red'))
            process.exit(1)
        } else {
            console.log()
            console.log(colorize('🎉 All models processed successfully!', 'green'))
            process.exit(0)
        }

    } catch (error) {
        console.error()
        console.error(colorize('❌ Script failed:', 'red'))
        console.error(colorize(error instanceof Error ? error.message : 'Unknown error', 'red'))

        if (error instanceof Error && error.stack) {
            console.error()
            console.error(colorize('Stack trace:', 'red'))
            console.error(error.stack)
        }

        process.exit(1)
    }
}

// Run the CLI
runGenerator() 