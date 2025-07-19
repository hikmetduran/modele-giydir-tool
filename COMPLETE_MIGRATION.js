#!/usr/bin/env node

/**
 * Complete Appwrite Migration Script
 * This script updates all imports from Supabase to Appwrite
 * and cleans up deprecated files
 */

const fs = require('fs')
const path = require('path')

console.log('🚀 Starting complete Appwrite migration...')

// Files to update
const filesToUpdate = [
    'src/components/auth/AuthProvider.tsx',
    'src/components/upload/FileUpload.tsx',
    'src/components/process/ProcessingFlow.tsx',
    'src/components/gallery/ResultsGallery.tsx',
    'src/components/profile/Profile.tsx',
    'src/lib/edge-functions.ts',
    'src/lib/supabase-storage.ts',
    'src/lib/supabase.ts'
]

// Migration mappings
const importMappings = {
    // Storage imports
    "import { supabase } from '@/lib/supabase'": "import { account, databases, storage } from '@/lib/appwrite'",
    "import { supabase } from './supabase'": "import { account, databases, storage } from './appwrite'",
    "import { supabase } from '../supabase'": "import { account, databases, storage } from '../appwrite'",
    
    // Storage functions
    "import { uploadFile, uploadProductImage } from '@/lib/supabase-storage'": "import { uploadFile, uploadProductImage } from '@/lib/appwrite-storage'",
    "import { getUserProductImages } from '@/lib/supabase-storage'": "import { getUserProductImages } from '@/lib/appwrite-storage'",
    "import { deleteProductImage } from '@/lib/supabase-storage'": "import { deleteProductImage } from '@/lib/appwrite-storage'",
    
    // Edge functions
    "import { processTryOnWithEdgeFunction } from '@/lib/edge-functions'": "import { processTryOnWithEdgeFunction } from '@/lib/appwrite-edge-functions'",
    
    // Auth functions
    "import { getAuthUser } from '@/lib/supabase'": "import { getAuthUser } from '@/lib/appwrite'",
    "import { getUserProfile } from '@/lib/supabase'": "import { getUserProfile } from '@/lib/appwrite'",
    "import { getUserWallet } from '@/lib/supabase'": "import { getUserWallet } from '@/lib/appwrite'",
    "import { deductCredits } from '@/lib/supabase'": "import { deductCredits } from '@/lib/appwrite'",
    "import { refundCredits } from '@/lib/supabase'": "import { refundCredits } from '@/lib/appwrite'"
}

// Function to update file imports
function updateFileImports(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ File not found: ${filePath}`)
        return false
    }

    let content = fs.readFileSync(filePath, 'utf8')
    let updated = false

    // Apply import mappings
    for (const [oldImport, newImport] of Object.entries(importMappings)) {
        if (content.includes(oldImport)) {
            content = content.replace(new RegExp(oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newImport)
            updated = true
            console.log(`✅ Updated import in: ${filePath}`)
        }
    }

    // Update function calls
    const functionMappings = {
        'supabase.storage.from': 'storage',
        'supabase.from': 'databases',
        'supabase.auth': 'account',
        'supabase.functions.invoke': 'functions.createExecution'
    }

    for (const [oldCall, newCall] of Object.entries(functionMappings)) {
        if (content.includes(oldCall)) {
            content = content.replace(new RegExp(oldCall.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newCall)
            updated = true
        }
    }

    if (updated) {
        fs.writeFileSync(filePath, content)
        console.log(`📝 Updated: ${filePath}`)
        return true
    }

    return false
}

// Function to create backup
function createBackup() {
    const backupDir = `migration-backup-${Date.now()}`
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir)
    }

    // Backup supabase files
    const filesToBackup = [
        'src/lib/supabase.ts',
        'src/lib/supabase-storage.ts',
        'src/lib/edge-functions.ts',
        'supabase/'
    ]

    filesToBackup.forEach(file => {
        if (fs.existsSync(file)) {
            const dest = path.join(backupDir, file)
            const destDir = path.dirname(dest)
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true })
            }
            
            if (fs.statSync(file).isDirectory()) {
                fs.cpSync(file, dest, { recursive: true })
            } else {
                fs.copyFileSync(file, dest)
            }
            console.log(`📦 Backed up: ${file}`)
        }
    })

    return backupDir
}

// Function to clean up deprecated files
function cleanupDeprecatedFiles() {
    const deprecatedFiles = [
        'src/lib/supabase-storage.ts',
        'src/lib/edge-functions.ts',
        'setup-appwrite-collections.sh',
        'setup-appwrite-complete.sh'
    ]

    deprecatedFiles.forEach(file => {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file)
            console.log(`🗑️ Removed: ${file}`)
        }
    })
}

// Function to update package.json
function updatePackageJson() {
    const packagePath = 'package.json'
    if (!fs.existsSync(packagePath)) return

    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    
    // Remove supabase dependencies
    if (packageJson.dependencies) {
        delete packageJson.dependencies['@supabase/supabase-js']
        delete packageJson.dependencies['@supabase/auth-helpers-nextjs']
    }

    // Add appwrite if not present
    if (!packageJson.dependencies.appwrite) {
        packageJson.dependencies.appwrite = "^14.0.0"
    }

    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2))
    console.log('📦 Updated package.json')
}

// Main migration function
async function migrate() {
    console.log('🔧 Starting complete Appwrite migration...')
    
    // Create backup
    const backupDir = createBackup()
    console.log(`📦 Backup created: ${backupDir}`)
    
    // Update files
    let updatedCount = 0
    filesToUpdate.forEach(file => {
        if (updateFileImports(file)) {
            updatedCount++
        }
    })
    
    // Update package.json
    updatePackageJson()
    
    // Clean up deprecated files
    cleanupDeprecatedFiles()
    
    console.log('\n✅ Migration complete!')
    console.log(`📊 Updated ${updatedCount} files`)
    console.log(`📦 Backup saved to: ${backupDir}`)
    console.log('\n🎯 Next steps:')
    console.log('1. Test your application')
    console.log('2. Update any remaining hardcoded references')
    console.log('3. Deploy to Vercel with updated environment variables')
    console.log('4. Remove backup directory when satisfied: rm -rf ' + backupDir)
}

// Run migration
migrate().catch(console.error)
