#!/usr/bin/env node

// Load environment variables from .env.local
import { config } from 'dotenv'
import { join } from 'path'

// Load .env.local file
config({ path: join(process.cwd(), '.env.local') })

import { fal } from '@fal-ai/client'
import { supabaseServer } from '../lib/supabase'
import { readFileSync } from 'fs'

// Configure Fal AI client
fal.config({
    credentials: process.env.NEXT_PUBLIC_FAL_KEY
})

interface ModelPrompt {
    name: string
    description: string
    gender: 'male' | 'female' | 'unisex'
    prompt: string
}

interface ModelPromptsData {
    model_photos: ModelPrompt[]
}

interface GenerationResult {
    success: boolean
    modelName: string
    imageUrl?: string
    imagePath?: string
    error?: string
}

// FalAI minimax API types
interface MinimaxInput {
    prompt: string
    aspect_ratio?: '1:1' | '16:9' | '4:3' | '3:2' | '2:3' | '3:4' | '9:16' | '21:9'
    num_images?: number
    prompt_optimizer?: boolean
}

interface MinimaxOutput {
    images: Array<{
        url: string
        file_name: string
        content_type: string
        file_size: number
    }>
}

class ModelPhotoGenerator {
    private readonly BUCKET_NAME = 'model-photos'
    private readonly ASPECT_RATIO = '2:3' as const // Portrait format suitable for fashion models

    constructor() {
        this.validateEnvironment()
    }

    private validateEnvironment() {
        const requiredEnvVars = ['NEXT_PUBLIC_FAL_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
        const missing = requiredEnvVars.filter(key => !process.env[key])

        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
        }
    }

    private async loadModelPrompts(): Promise<ModelPrompt[]> {
        try {
            const promptsPath = join(process.cwd(), '..', 'resources', 'model-prompts.json')
            const promptsData = JSON.parse(readFileSync(promptsPath, 'utf8')) as ModelPromptsData
            return promptsData.model_photos
        } catch (error) {
            console.error('❌ Failed to load model prompts:', error)
            throw new Error('Could not load model prompts from resources/model-prompts.json')
        }
    }

    private async checkExistingModel(name: string, description: string): Promise<boolean> {
        try {
            const { data, error } = await supabaseServer
                .from('model_photos')
                .select('id')
                .eq('name', name)
                .eq('description', description)
                .limit(1)

            if (error) {
                console.error('❌ Error checking existing model:', error)
                return false
            }

            return data && data.length > 0
        } catch (error) {
            console.error('❌ Failed to check existing model:', error)
            return false
        }
    }

    private async generateImageWithFalAI(prompt: string, modelName: string): Promise<string | null> {
        try {
            console.log(`🎨 Generating image for ${modelName}...`)

            const input: MinimaxInput = {
                prompt,
                aspect_ratio: this.ASPECT_RATIO,
                num_images: 1,
                prompt_optimizer: true
            }

            // Submit request to FalAI
            const result = await fal.queue.submit('fal-ai/minimax/image-01', { input })
            console.log(`⏳ Request submitted for ${modelName}, request ID: ${result.request_id}`)

            // Poll for completion
            let attempts = 0
            const maxAttempts = 60 // 5 minutes max (5 second intervals)

            while (attempts < maxAttempts) {
                const status = await fal.queue.status('fal-ai/minimax/image-01', {
                    requestId: result.request_id,
                    logs: true
                })

                console.log(`📊 ${modelName} status: ${status.status} (attempt ${attempts + 1}/${maxAttempts})`)

                if (status.status === 'COMPLETED') {
                    // Get the result
                    const output = await fal.queue.result('fal-ai/minimax/image-01', {
                        requestId: result.request_id
                    }) as { data: MinimaxOutput }

                    if (output.data?.images?.[0]?.url) {
                        console.log(`✅ Image generated successfully for ${modelName}`)
                        return output.data.images[0].url
                    } else {
                        throw new Error('No image URL in response')
                    }
                } else if ((status as { status: string; logs?: unknown }).status === 'FAILED') {
                    throw new Error(`Generation failed: ${JSON.stringify((status as { logs?: unknown }).logs)}`)
                }

                attempts++
                await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
            }

            throw new Error('Generation timed out')
        } catch (error) {
            console.error(`❌ Failed to generate image for ${modelName}:`, error)
            return null
        }
    }

    private async downloadImage(url: string): Promise<Blob> {
        try {
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
            }
            return await response.blob()
        } catch (error) {
            console.error('❌ Failed to download image:', error)
            throw error
        }
    }

    private async uploadToSupabase(imageBlob: Blob, modelName: string): Promise<{ url: string; path: string } | null> {
        try {
            const fileName = `${modelName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpg`
            const filePath = `generated/${fileName}`

            console.log(`📤 Uploading ${fileName} to Supabase storage...`)

            const { error } = await supabaseServer.storage
                .from(this.BUCKET_NAME)
                .upload(filePath, imageBlob, {
                    contentType: 'image/jpeg',
                    upsert: false
                })

            if (error) {
                console.error('❌ Upload error:', error)
                return null
            }

            // Get public URL
            const { data: publicUrlData } = supabaseServer.storage
                .from(this.BUCKET_NAME)
                .getPublicUrl(filePath)

            console.log(`✅ Image uploaded successfully: ${publicUrlData.publicUrl}`)

            return {
                url: publicUrlData.publicUrl,
                path: filePath
            }
        } catch (error) {
            console.error('❌ Failed to upload to Supabase:', error)
            return null
        }
    }

    private async saveToDatabase(model: ModelPrompt, imageUrl: string, imagePath: string): Promise<boolean> {
        try {
            console.log(`💾 Saving ${model.name} to database...`)

            const { error } = await supabaseServer
                .from('model_photos')
                .insert({
                    name: model.name,
                    description: model.description,
                    image_url: imageUrl,
                    image_path: imagePath,
                    gender: model.gender,
                    is_active: true,
                    sort_order: 0
                })

            if (error) {
                console.error('❌ Database error:', error)
                return false
            }

            console.log(`✅ ${model.name} saved to database`)
            return true
        } catch (error) {
            console.error('❌ Failed to save to database:', error)
            return false
        }
    }

    private async generateSingleModel(model: ModelPrompt): Promise<GenerationResult> {
        const result: GenerationResult = {
            success: false,
            modelName: model.name
        }

        try {
            // Check if model already exists
            const exists = await this.checkExistingModel(model.name, model.description)
            if (exists) {
                console.log(`⏭️  Skipping ${model.name} - already exists`)
                return { ...result, success: true, error: 'Already exists' }
            }

            // Generate image with FalAI
            const imageUrl = await this.generateImageWithFalAI(model.prompt, model.name)
            if (!imageUrl) {
                return { ...result, error: 'Failed to generate image' }
            }

            // Download the generated image
            const imageBlob = await this.downloadImage(imageUrl)

            // Upload to Supabase storage
            const uploadResult = await this.uploadToSupabase(imageBlob, model.name)
            if (!uploadResult) {
                return { ...result, error: 'Failed to upload image' }
            }

            // Save to database
            const dbSuccess = await this.saveToDatabase(model, uploadResult.url, uploadResult.path)
            if (!dbSuccess) {
                return { ...result, error: 'Failed to save to database' }
            }

            return {
                success: true,
                modelName: model.name,
                imageUrl: uploadResult.url,
                imagePath: uploadResult.path
            }
        } catch (error) {
            console.error(`❌ Error processing ${model.name}:`, error)
            return {
                ...result,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    async generateAllModels(): Promise<GenerationResult[]> {
        try {
            console.log('🚀 Starting model photo generation...')

            const models = await this.loadModelPrompts()
            console.log(`📋 Found ${models.length} models to process`)

            const results: GenerationResult[] = []

            // Process models sequentially to avoid overwhelming the API
            for (let i = 0; i < models.length; i++) {
                const model = models[i]
                console.log(`\n📸 Processing ${i + 1}/${models.length}: ${model.name}`)

                const result = await this.generateSingleModel(model)
                results.push(result)

                // Add delay between requests only if we actually made an API call
                // Skip delay if model was skipped (already exists)
                if (i < models.length - 1 && result.success && result.error !== 'Already exists') {
                    console.log('⏳ Waiting 2 seconds before next request...')
                    await new Promise(resolve => setTimeout(resolve, 2000))
                }
            }

            return results
        } catch (error) {
            console.error('❌ Failed to generate models:', error)
            throw error
        }
    }

    printSummary(results: GenerationResult[]) {
        console.log('\n📊 Generation Summary:')
        console.log('='.repeat(50))

        const successful = results.filter(r => r.success && r.error !== 'Already exists')
        const skipped = results.filter(r => r.success && r.error === 'Already exists')
        const failed = results.filter(r => !r.success)

        console.log(`✅ Successfully generated: ${successful.length}`)
        console.log(`⏭️  Skipped (already exists): ${skipped.length}`)
        console.log(`❌ Failed: ${failed.length}`)

        if (failed.length > 0) {
            console.log('\n❌ Failed models:')
            failed.forEach(result => {
                console.log(`  - ${result.modelName}: ${result.error}`)
            })
        }

        if (successful.length > 0) {
            console.log('\n✅ Successfully generated models:')
            successful.forEach(result => {
                console.log(`  - ${result.modelName}: ${result.imageUrl}`)
            })
        }
    }
}

// Main execution
async function main() {
    try {
        const generator = new ModelPhotoGenerator()
        const results = await generator.generateAllModels()
        generator.printSummary(results)

        const failedCount = results.filter(r => !r.success).length
        process.exit(failedCount > 0 ? 1 : 0)
    } catch (error) {
        console.error('❌ Script failed:', error)
        process.exit(1)
    }
}

// Run the script if called directly
if (require.main === module) {
    main()
}

export { ModelPhotoGenerator } 