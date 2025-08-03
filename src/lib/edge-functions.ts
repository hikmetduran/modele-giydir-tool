import { supabase } from './supabase'

export interface TryOnRequest {
    productImageId: string
    modelPhotoId: string
    jobId: string
    category?: string
    isRegeneration?: boolean
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
    category?: string,
    isRegeneration?: boolean
): Promise<TryOnResult> {
    try {
        console.log('🚀 Calling edge function for try-on processing:', {
            productImageId,
            modelPhotoId,
            jobId,
            category,
            isRegeneration
        })

        const { data, error } = await supabase.functions.invoke('process-try-on', {
            body: {
                productImageId,
                modelPhotoId,
                jobId,
                category,
                isRegeneration
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

// Video Generation Types and Functions

export interface VideoGenerationRequest {
    tryOnResultId: string
}

export interface VideoGenerationResult {
    success: boolean
    videoUrl?: string
    requestId?: string
    error?: string
}

export async function processVideoGenerationWithEdgeFunction(
    tryOnResultId: string
): Promise<VideoGenerationResult> {
    try {
        console.log('🎬 Calling edge function for video generation:', {
            tryOnResultId
        })

        const { data, error } = await supabase.functions.invoke('process-video-generation', {
            body: {
                tryOnResultId
            }
        })

        if (error) {
            console.error('❌ Video generation edge function error:', error)
            return {
                success: false,
                error: error.message || 'Video generation edge function call failed'
            }
        }

        console.log('✅ Video generation edge function response:', data)
        return data as VideoGenerationResult
    } catch (error) {
        console.error('❌ Video generation edge function call failed:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

export async function getVideoGenerationStatus(
    tryOnResultId: string,
    userId: string
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('try_on_results')
            .select('video_status, video_url, video_error_message, video_processing_started_at, video_processing_completed_at')
            .eq('id', tryOnResultId)
            .eq('user_id', userId)
            .single()

        if (error) {
            console.error('❌ Failed to get video generation status:', error)
            return {
                success: false,
                error: error.message
            }
        }

        return {
            success: true,
            data
        }
    } catch (error) {
        console.error('❌ Error getting video generation status:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}