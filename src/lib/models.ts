import { ModelImage } from './types'
import { supabase } from './supabase'

// Cache for model images to avoid repeated database calls
let modelImagesCache: ModelImage[] | null = null
let cacheTimestamp: number | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Function to get all active model photos from the database
export async function getAllModelImages(): Promise<ModelImage[]> {
    // Check if we have cached data that's still valid
    if (modelImagesCache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
        return modelImagesCache
    }

    try {
        const { data, error } = await supabase
            .from('model_photos')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })

        if (error) {
            console.error('Error fetching model photos:', error)
            throw error
        }

        // Convert database records to ModelImage interface
        const modelImages: ModelImage[] = (data || []).map(photo => ({
            id: photo.id,
            name: photo.name,
            url: photo.image_url,
            preview: photo.image_url, // Using the same URL for preview, you can create thumbnails later
            description: photo.description || undefined
        }))

        // Update cache
        modelImagesCache = modelImages
        cacheTimestamp = Date.now()

        return modelImages
    } catch (error) {
        console.error('Failed to fetch model images:', error)
        // Return empty array if database fetch fails
        return []
    }
}

// Function to get model by ID from the database
export async function getModelById(id: string): Promise<ModelImage | undefined> {
    try {
        const { data, error } = await supabase
            .from('model_photos')
            .select('*')
            .eq('id', id)
            .eq('is_active', true)
            .single()

        if (error) {
            console.error('Error fetching model photo by ID:', error)
            return undefined
        }

        if (!data) {
            return undefined
        }

        return {
            id: data.id,
            name: data.name,
            url: data.image_url,
            preview: data.image_url,
            description: data.description || undefined
        }
    } catch (error) {
        console.error('Failed to fetch model by ID:', error)
        return undefined
    }
}

// Function to get random models for suggestions
export async function getRandomModels(count: number = 3): Promise<ModelImage[]> {
    try {
        const allModels = await getAllModelImages()

        if (allModels.length === 0) {
            return []
        }

        // Shuffle the array and take the requested count
        const shuffled = [...allModels].sort(() => 0.5 - Math.random())
        return shuffled.slice(0, count)
    } catch (error) {
        console.error('Failed to fetch random models:', error)
        return []
    }
}

// Function to filter models by style/gender
export async function getModelsByStyle(style: string): Promise<ModelImage[]> {
    try {
        const { data, error } = await supabase
            .from('model_photos')
            .select('*')
            .eq('is_active', true)
            .or(`gender.ilike.%${style}%,body_type.ilike.%${style}%,name.ilike.%${style}%,description.ilike.%${style}%`)
            .order('sort_order', { ascending: true })

        if (error) {
            console.error('Error filtering models by style:', error)
            throw error
        }

        return (data || []).map(photo => ({
            id: photo.id,
            name: photo.name,
            url: photo.image_url,
            preview: photo.image_url,
            description: photo.description || undefined
        }))
    } catch (error) {
        console.error('Failed to filter models by style:', error)
        return []
    }
}

// Function to get models by gender
export async function getModelsByGender(gender: 'male' | 'female' | 'unisex'): Promise<ModelImage[]> {
    try {
        const { data, error } = await supabase
            .from('model_photos')
            .select('*')
            .eq('is_active', true)
            .eq('gender', gender)
            .order('sort_order', { ascending: true })

        if (error) {
            console.error('Error filtering models by gender:', error)
            throw error
        }

        return (data || []).map(photo => ({
            id: photo.id,
            name: photo.name,
            url: photo.image_url,
            preview: photo.image_url,
            description: photo.description || undefined
        }))
    } catch (error) {
        console.error('Failed to filter models by gender:', error)
        return []
    }
}

// Function to clear the model cache (useful for admin operations)
export function clearModelCache(): void {
    modelImagesCache = null
    cacheTimestamp = null
}

// Function to get storage URL for a model image
export function getModelImageStorageUrl(imagePath: string): string {
    const { data } = supabase.storage
        .from('model-photos')
        .getPublicUrl(imagePath)

    return data.publicUrl
}

// Legacy compatibility - keep this for now but make it async
export async function getModelImages(): Promise<ModelImage[]> {
    return await getAllModelImages()
} 