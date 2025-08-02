import { ModelPhoto, Gender, GarmentType } from './database/types'
import { supabase } from './supabase'

// Cache for model photos to avoid repeated database calls
let modelPhotosCache: ModelPhoto[] | null = null
let cacheTimestamp: number | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Function to get all active model photos from the database
export async function getAllModelPhotos(): Promise<ModelPhoto[]> {
    // Check if we have cached data that's still valid
    if (modelPhotosCache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
        return modelPhotosCache
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

        // Cache the results
        modelPhotosCache = data || []
        cacheTimestamp = Date.now()

        return data || []
    } catch (error) {
        console.error('Failed to fetch model photos:', error)
        return []
    }
}

// Function to get model by ID from the database
export async function getModelPhotoById(id: string): Promise<ModelPhoto | undefined> {
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

        return data || undefined
    } catch (error) {
        console.error('Failed to fetch model by ID:', error)
        return undefined
    }
}

// Function to get random model photos for suggestions
export async function getRandomModelPhotos(count: number = 3): Promise<ModelPhoto[]> {
    try {
        const allModels = await getAllModelPhotos()

        if (allModels.length === 0) {
            return []
        }

        // Shuffle the array and take the requested count
        const shuffled = [...allModels].sort(() => 0.5 - Math.random())
        return shuffled.slice(0, count)
    } catch (error) {
        console.error('Failed to fetch random model photos:', error)
        return []
    }
}

// Function to filter model photos by style/gender
export async function getModelPhotosByStyle(style: string): Promise<ModelPhoto[]> {
    try {
        const { data, error } = await supabase
            .from('model_photos')
            .select('*')
            .eq('is_active', true)
            .or(`gender.ilike.%${style}%,body_type.ilike.%${style}%,name.ilike.%${style}%,description.ilike.%${style}%`)
            .order('sort_order', { ascending: true })

        if (error) {
            console.error('Error filtering model photos by style:', error)
            throw error
        }

        return data || []
    } catch (error) {
        console.error('Failed to filter model photos by style:', error)
        return []
    }
}

// Function to get model photos by gender
export async function getModelPhotosByGender(gender: Gender): Promise<ModelPhoto[]> {
    try {
        const { data, error } = await supabase
            .from('model_photos')
            .select('*')
            .eq('is_active', true)
            .eq('gender', gender)
            .order('sort_order', { ascending: true })

        if (error) {
            console.error('Error filtering model photos by gender:', error)
            throw error
        }

        return data || []
    } catch (error) {
        console.error('Failed to filter model photos by gender:', error)
        return []
    }
}

// Function to get model photos by garment types
export async function getModelPhotosByGarmentTypes(garmentTypes: GarmentType[]): Promise<ModelPhoto[]> {
    try {
        const { data, error } = await supabase
            .from('model_photos')
            .select('*')
            .eq('is_active', true)
            .overlaps('garment_types', garmentTypes)
            .order('sort_order', { ascending: true })

        if (error) {
            console.error('Error filtering model photos by garment types:', error)
            throw error
        }

        return data || []
    } catch (error) {
        console.error('Failed to filter model photos by garment types:', error)
        return []
    }
}

// Function to get model photos by single garment type
export async function getModelPhotosByGarmentType(garmentType: GarmentType): Promise<ModelPhoto[]> {
    return await getModelPhotosByGarmentTypes([garmentType])
}

// Function to clear the model cache (useful for admin operations)
export function clearModelCache(): void {
    modelPhotosCache = null
    cacheTimestamp = null
}

// Function to get storage URL for a model image
export function getModelImageStorageUrl(imagePath: string): string {
    const { data } = supabase.storage
        .from('model-photos')
        .getPublicUrl(imagePath)

    return data.publicUrl
}

// Legacy compatibility functions
export async function getAllModelImages(): Promise<ModelPhoto[]> {
    return await getAllModelPhotos()
}

export async function getModelById(id: string): Promise<ModelPhoto | undefined> {
    return await getModelPhotoById(id)
}

export async function getRandomModels(count: number = 3): Promise<ModelPhoto[]> {
    return await getRandomModelPhotos(count)
}

export async function getModelsByStyle(style: string): Promise<ModelPhoto[]> {
    return await getModelPhotosByStyle(style)
}

export async function getModelsByGender(gender: 'male' | 'female' | 'unisex'): Promise<ModelPhoto[]> {
    return await getModelPhotosByGender(gender as Gender)
}

export async function getModelImages(): Promise<ModelPhoto[]> {
    return await getAllModelPhotos()
}
