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
    credentials: process.env.FAL_API_KEY
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

// FalAI hidream-i1-fast API types
interface HidreamInput {
    prompt: string
    negative_prompt?: string
    image_size?: 'square_hd' | 'square' | 'portrait_4_3' | 'portrait_16_9' | 'landscape_4_3' | 'landscape_16_9' | { width: number; height: number }
    num_inference_steps?: number
    seed?: number
    sync_mode?: boolean
    num_images?: number
    enable_safety_checker?: boolean
    output_format?: 'jpeg' | 'png'
}

interface HidreamOutput {
    images: Array<{
        url: string
        content_type: string
    }>
    timings?: any
    seed: number
    has_nsfw_concepts: boolean[]
    prompt: string
}

class ModelPhotoGenerator {
    private readonly BUCKET_NAME = 'model-photos'
    private readonly IMAGE_SIZE = 'portrait_4_3' as const // Portrait format suitable for fashion models
    private readonly overwrite: boolean

    constructor(overwrite: boolean = false) {
        this.overwrite = overwrite
        this.validateEnvironment()
    }

    private validateEnvironment() {
        const requiredEnvVars = ['FAL_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
        const missing = requiredEnvVars.filter(key => !process.env[key])

        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
        }
    }

    private async loadModelPrompts(): Promise<ModelPrompt[]> {
        try {
            const promptsPath = join(process.cwd(), 'resources', 'model-prompts.json')
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

            const input: HidreamInput = {
                prompt,
                image_size: this.IMAGE_SIZE,
                num_images: 1,
                num_inference_steps: 16,
                enable_safety_checker: true,
                output_format: 'jpeg'
            }

            // Submit request to FalAI
            const result = await fal.queue.submit('fal-ai/hidream-i1-fast', { input })
            console.log(`⏳ Request submitted for ${modelName}, request ID: ${result.request_id}`)

            // Poll for completion
            let attempts = 0
            const maxAttempts = 60 // 5 minutes max (5 second intervals)

            while (attempts < maxAttempts) {
                const status = await fal.queue.status('fal-ai/hidream-i1-fast', {
                    requestId: result.request_id,
                    logs: true
                })

                console.log(`📊 ${modelName} status: ${status.status} (attempt ${attempts + 1}/${maxAttempts})`)

                if (status.status === 'COMPLETED') {
                    // Get the result
                    const output = await fal.queue.result('fal-ai/hidream-i1-fast', {
                        requestId: result.request_id
                    }) as { data: HidreamOutput }

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
                    upsert: this.overwrite
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

            // If overwriting, delete existing records first
            if (this.overwrite) {
                const { error: deleteError } = await supabaseServer
                    .from('model_photos')
                    .delete()
                    .eq('name', model.name)
                    .eq('description', model.description)

                if (deleteError) {
                    console.error('❌ Error deleting existing record:', deleteError)
                    // Continue with insert anyway, as the record might not exist
                }
            }

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
            // Check if model already exists (skip check if overwrite is enabled)
            if (!this.overwrite) {
                const exists = await this.checkExistingModel(model.name, model.description)
                if (exists) {
                    console.log(`⏭️  Skipping ${model.name} - already exists`)
                    return { ...result, success: true, error: 'Already exists' }
                }
            } else {
                console.log(`🔄 Overwriting ${model.name}...`)
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
        const overwrite = process.argv.includes('--overwrite')
        const generator = new ModelPhotoGenerator(overwrite)
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