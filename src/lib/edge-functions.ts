import { supabase } from './supabase'

export interface TryOnRequest {
    productImageId: string
    modelPhotoId: string
    jobId: string
    category?: string
}

export interface TryOnResult {
    success: boolean
    resultUrl?: string
    requestId?: string
    error?: string
}

export async function processTryOnWithEdgeFunction(
    productImageId: string,
    modelPhotoId: string,
    jobId: string,
    category?: string
): Promise<TryOnResult> {
    try {
        console.log('🚀 Calling edge function for try-on processing:', { productImageId, modelPhotoId, jobId, category })

        const { data, error } = await supabase.functions.invoke('process-try-on', {
            body: {
                productImageId,
                modelPhotoId,
                jobId,
                category
            }
        })

        if (error) {
            console.error('❌ Edge function error:', error)
            return {
                success: false,
                error: error.message || 'Edge function call failed'
            }
        }

        console.log('✅ Edge function response:', data)
        return data as TryOnResult
    } catch (error) {
        console.error('❌ Edge function call failed:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
} 