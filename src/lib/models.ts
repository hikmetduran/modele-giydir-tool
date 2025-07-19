import { ModelImage } from './types'
import { databases, COLLECTIONS } from './appwrite'
import { Query } from 'appwrite'

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
        const response = await databases.listDocuments(
            'modele-giydir-db',
            COLLECTIONS.modelPhotos,
            [
                Query.equal('is_active', true),
                Query.orderAsc('sort_order')
            ]
        )

        // Convert database records to ModelImage interface
        const modelImages: ModelImage[] = response.documents.map(photo => ({
            id: photo.$id,
            name: photo.name,
            url: photo.image_url,
            preview: photo.image_url,
            description: photo.description || undefined,
            gender: photo.gender || undefined
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
        const response = await databases.getDocument(
            'modele-giydir-db',
            COLLECTIONS.modelPhotos,
            id
        )

        if (!response) {
            return undefined
        }

        return {
            id: response.$id,
            name: response.name,
            url: response.image_url,
            preview: response.image_url,
            description: response.description || undefined,
            gender: response.gender || undefined
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
        const response = await databases.listDocuments(
            'modele-giydir-db',
            COLLECTIONS.modelPhotos,
            [
                Query.equal('is_active', true),
                Query.or([
                    Query.contains('gender', style),
                    Query.contains('body_type', style),
                    Query.contains('name', style),
                    Query.contains('description', style)
                ])
            ]
        )

        return response.documents.map(photo => ({
            id: photo.$id,
            name: photo.name,
            url: photo.image_url,
            preview: photo.image_url,
            description: photo.description || undefined,
            gender: photo.gender || undefined
        }))
    } catch (error) {
        console.error('Failed to filter models by style:', error)
        return []
    }
}

// Function to get models by gender
export async function getModelsByGender(gender: 'male' | 'female' | 'unisex'): Promise<ModelImage[]> {
    try {
        const response = await databases.listDocuments(
            'modele-giydir-db',
            COLLECTIONS.modelPhotos,
            [
                Query.equal('is_active', true),
                Query.equal('gender', gender),
                Query.orderAsc('sort_order')
            ]
        )

        return response.documents.map(photo => ({
            id: photo.$id,
            name: photo.name,
            url: photo.image_url,
            preview: photo.image_url,
            description: photo.description || undefined,
            gender: photo.gender || undefined
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
    // This would be used if we need to construct URLs from storage paths
    // For now, we use the direct URL from the database
    return imagePath
}

// Legacy compatibility - keep this for now but make it async
export async function getModelImages(): Promise<ModelImage[]> {
    return await getAllModelImages()
}
