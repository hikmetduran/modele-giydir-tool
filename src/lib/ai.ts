// This file is now deprecated - use the Supabase Edge Function instead
// All Fal AI operations should be handled through the edge function at:
// supabase/functions/process-try-on/index.ts

export interface TryOnInput {
    modelImageUrl: string
    garmentImageUrl: string
}

export interface TryOnResult {
    success: boolean
    resultUrl?: string
    requestId?: string
    error?: string
}

export interface ProcessingStatus {
    status: 'queued' | 'processing' | 'completed' | 'failed'
    progress: number
    message?: string
}

// All functions are now deprecated - use the edge function instead
export async function submitTryOnRequest(): Promise<{ requestId: string } | { error: string }> {
    throw new Error('Deprecated: Use Supabase Edge Function instead')
}

export async function checkTryOnStatus(): Promise<ProcessingStatus> {
    throw new Error('Deprecated: Use Supabase Edge Function instead')
}

export async function getTryOnResult(): Promise<TryOnResult> {
    throw new Error('Deprecated: Use Supabase Edge Function instead')
}

export async function processTryOnWithUpdates(): Promise<TryOnResult> {
    throw new Error('Deprecated: Use Supabase Edge Function instead')
}

/**
 * Convert a file to a data URL for API submission
 */
export async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

/**
 * Helper function to get image URL from different sources
 */
export function getImageUrl(imageSource: string | File | undefined | null): Promise<string> {
    if (!imageSource) {
        return Promise.reject(new Error('Image source is null or undefined'))
    }

    if (typeof imageSource === 'string') {
        console.log('🔗 Using URL directly:', imageSource)
        return Promise.resolve(imageSource)
    } else if (imageSource instanceof File) {
        console.log('📄 Converting file to base64:', imageSource.name, imageSource.size)
        return fileToDataUrl(imageSource)
    } else {
        return Promise.reject(new Error('Invalid image source type'))
    }
}
