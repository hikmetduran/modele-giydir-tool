import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Import Fal.ai client for Deno
import { fal } from 'https://esm.sh/@fal-ai/client@1.0.0'

// Declare Deno global for TypeScript
declare const Deno: {
    env: {
        get(key: string): string | undefined
    }
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FAL_API_KEY = Deno.env.get('FAL_KEY')

// Configure Fal.ai client
if (FAL_API_KEY) {
    fal.config({
        credentials: FAL_API_KEY
    })
} else {
    console.error('❌ FAL_KEY environment variable not set')
}

interface VideoGenerationRequest {
    tryOnResultId: string
}

interface VideoGenerationInput {
    imageUrl: string
    prompt?: string
    resolution?: '480p' | '720p' | '1080p'
    duration?: number
    cameraFixed?: boolean
}

interface VideoGenerationResult {
    success: boolean
    videoUrl?: string
    requestId?: string
    error?: string
}

interface ProcessingStatus {
    status: 'queued' | 'processing' | 'completed' | 'failed'
    progress: number
    message?: string
}

/**
 * Submit a video generation request to Fal AI using ByteDance SeedDance
 */
async function submitVideoGenerationRequest(input: VideoGenerationInput): Promise<{ requestId: string } | { error: string }> {
    try {
        console.log('🎬 Submitting video generation request to Fal AI...')
        
        const { request_id } = await fal.queue.submit("fal-ai/bytedance/seedance/v1/lite/image-to-video", {
            input: {
                image_url: input.imageUrl,
                prompt: input.prompt || "fashion model, very subtle turning movements",
                resolution: input.resolution || "480p",
                duration: input.duration || 5,
                camera_fixed: input.cameraFixed || false
            }
        })

        console.log('✅ Video generation request submitted successfully:', request_id)
        return { requestId: request_id }
    } catch (error) {
        console.error('❌ Failed to submit video generation request:', error)
        return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Check the status of a video generation request
 */
async function checkVideoGenerationStatus(requestId: string): Promise<ProcessingStatus> {
    try {
        const status = await fal.queue.status("fal-ai/bytedance/seedance/v1/lite/image-to-video", {
            requestId: requestId,
            logs: true,
        })

        console.log('📊 Video generation status check response:', status)

        let mappedStatus: ProcessingStatus['status']
        let progress: number

        switch (status.status) {
            case 'IN_QUEUE':
                mappedStatus = 'queued'
                progress = 10
                break
            case 'IN_PROGRESS':
                mappedStatus = 'processing'
                progress = 50
                break
            case 'COMPLETED':
                mappedStatus = 'completed'
                progress = 100
                break
            default:
                mappedStatus = 'failed'
                progress = 0
        }

        let message = 'Generating video...'
        if (status.logs && status.logs.length > 0) {
            message = status.logs[status.logs.length - 1]?.message || 'Generating video...'
        }

        return {
            status: mappedStatus,
            progress,
            message
        }
    } catch (error) {
        console.error('❌ Failed to check video generation status:', error)
        return {
            status: 'failed',
            progress: 0,
            message: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Get the result of a completed video generation request
 */
async function getVideoGenerationResult(requestId: string): Promise<VideoGenerationResult> {
    try {
        console.log('📥 Getting video generation result for request:', requestId)

        const result = await fal.queue.result("fal-ai/bytedance/seedance/v1/lite/image-to-video", {
            requestId: requestId
        })

        console.log('✅ Video result received:', result)

        // For ByteDance SeedDance, the response structure is result.data.video.url
        if (result.data?.video?.url) {
            return {
                success: true,
                videoUrl: result.data.video.url,
                requestId
            }
        } else {
            return {
                success: false,
                error: 'No video result found',
                requestId
            }
        }
    } catch (error) {
        console.error('❌ Failed to get video generation result:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId
        }
    }
}

/**
 * Process a video generation request with real-time status updates
 */
async function processVideoGenerationWithUpdates(
    input: VideoGenerationInput,
    supabase: any,
    tryOnResultId: string,
    userId: string
): Promise<VideoGenerationResult> {
    try {
        // Update video status to processing
        await supabase
            .from('try_on_results')
            .update({
                video_status: 'processing',
                video_processing_started_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', tryOnResultId)

        // Submit the video generation request
        const submission = await submitVideoGenerationRequest(input)

        if ('error' in submission) {
            // Update video status to failed
            await supabase
                .from('try_on_results')
                .update({
                    video_status: 'failed',
                    video_error_message: submission.error,
                    video_processing_completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', tryOnResultId)

            return {
                success: false,
                error: submission.error
            }
        }

        const { requestId } = submission

        // Poll for status updates (videos take longer than images)
        let isCompleted = false
        let attempts = 0
        const maxAttempts = 240 // 20 minutes max (5 second intervals)

        while (!isCompleted && attempts < maxAttempts) {
            const status = await checkVideoGenerationStatus(requestId)

            if (status.status === 'completed') {
                isCompleted = true
                break
            } else if (status.status === 'failed') {
                // Refund credits when video generation fails
                await supabase.rpc('refund_credits', {
                    p_user_id: userId,
                    p_amount: 50,
                    p_description: 'Video generation refund - processing failed',
                    p_try_on_result_id: tryOnResultId
                })

                // Update video status to failed
                await supabase
                    .from('try_on_results')
                    .update({
                        video_status: 'failed',
                        video_error_message: status.message || 'Video generation failed',
                        video_processing_completed_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', tryOnResultId)

                return {
                    success: false,
                    error: status.message || 'Video generation failed',
                    requestId
                }
            }

            attempts++
            await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
        }

        if (!isCompleted) {
            // Refund credits when video generation times out
            await supabase.rpc('refund_credits', {
                p_user_id: userId,
                p_amount: 50,
                p_description: 'Video generation refund - request timed out',
                p_try_on_result_id: tryOnResultId
            })

            // Update video status to failed
            await supabase
                .from('try_on_results')
                .update({
                    video_status: 'failed',
                    video_error_message: 'Video generation timed out',
                    video_processing_completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', tryOnResultId)

            return {
                success: false,
                error: 'Video generation timed out',
                requestId
            }
        }

        // Get the final result
        const result = await getVideoGenerationResult(requestId)

        if (result.success && result.videoUrl) {
            // Download the result video
            const response = await fetch(result.videoUrl)
            const blob = await response.blob()

            // Generate unique filename
            const fileName = `try-on-video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.mp4`
            const filePath = `${userId}/${fileName}`

            // Upload to Supabase Storage with explicit content type
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('try-on-results')
                .upload(filePath, blob, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: 'video/mp4'
                })

            if (uploadError) {
                console.error('❌ Failed to upload video to storage:', uploadError)
                // Update with external URL as fallback
                await supabase
                    .from('try_on_results')
                    .update({
                        video_status: 'completed',
                        video_url: result.videoUrl,
                        video_processing_completed_at: new Date().toISOString(),
                        video_processing_time_seconds: 0,
                        video_error_message: `Storage upload failed: ${uploadError.message}`,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', tryOnResultId)

                return {
                    success: true,
                    videoUrl: result.videoUrl,
                    requestId
                }
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('try-on-results')
                .getPublicUrl(filePath)

            const publicUrl = urlData.publicUrl

            // Update video status to completed
            await supabase
                .from('try_on_results')
                .update({
                    video_status: 'completed',
                    video_url: publicUrl,
                    video_path: filePath,
                    video_processing_completed_at: new Date().toISOString(),
                    video_processing_time_seconds: 0,
                    updated_at: new Date().toISOString()
                })
                .eq('id', tryOnResultId)

            return {
                success: true,
                videoUrl: publicUrl,
                requestId
            }
        } else {
            // Refund credits when no video result found
            await supabase.rpc('refund_credits', {
                p_user_id: userId,
                p_amount: 50,
                p_description: 'Video generation refund - no video result found',
                p_try_on_result_id: tryOnResultId
            })

            // Update video status to failed
            await supabase
                .from('try_on_results')
                .update({
                    video_status: 'failed',
                    video_error_message: result.error || 'No video result found',
                    video_processing_completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', tryOnResultId)

            return {
                success: false,
                error: result.error || 'No video result found',
                requestId
            }
        }
    } catch (error) {
        console.error('❌ Video generation processing failed:', error)

        // Refund credits when processing fails with exception
        await supabase.rpc('refund_credits', {
            p_user_id: userId,
            p_amount: 50,
            p_description: 'Video generation refund - processing exception',
            p_try_on_result_id: tryOnResultId
        })

        // Update video status to failed
        await supabase
            .from('try_on_results')
            .update({
                video_status: 'failed',
                video_error_message: error instanceof Error ? error.message : 'Unknown error',
                video_processing_completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', tryOnResultId)

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    let supabase: any
    let user: any
    let body: VideoGenerationRequest | undefined

    try {
        // Get the authorization header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('No authorization header')
        }

        // Create Supabase client
        supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: { headers: { Authorization: authHeader } }
            }
        )

        // Get user from auth
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        if (authError || !authUser) {
            throw new Error('Unauthorized')
        }
        user = authUser

        // Parse request body
        body = await req.json() as VideoGenerationRequest
        const { tryOnResultId } = body

        console.log('🎬 Processing video generation request:', {
            tryOnResultId,
            userId: user.id
        })

        // Check user's credit balance and deduct credits before processing
        const { data: deductResult, error: deductError } = await supabase.rpc('deduct_credits', {
            p_user_id: user.id,
            p_amount: 50,
            p_description: 'Video generation',
            p_try_on_result_id: tryOnResultId
        })

        if (deductError) {
            console.error('❌ Error deducting credits:', deductError)
            throw new Error('Failed to deduct credits')
        }

        if (!deductResult) {
            console.error('❌ Insufficient credits for user:', user.id)
            throw new Error('Insufficient credits')
        }

        console.log('✅ Credits deducted successfully for user:', user.id)

        // Get try-on result details
        const { data: tryOnResult, error: tryOnError } = await supabase
            .from('try_on_results')
            .select('*')
            .eq('id', tryOnResultId)
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .not('result_image_url', 'is', null)
            .single()

        if (tryOnError || !tryOnResult) {
            // Refund credits if try-on result not found
            await supabase.rpc('refund_credits', {
                p_user_id: user.id,
                p_amount: 50,
                p_description: 'Video generation refund - try-on result not found',
                p_try_on_result_id: tryOnResultId
            })
            throw new Error('Try-on result not found or not ready for video generation')
        }

        // Process the video generation request
        const result = await processVideoGenerationWithUpdates(
            {
                imageUrl: tryOnResult.result_image_url,
                prompt: "fashion model, very subtle turning movements",
                resolution: "480p",
                duration: 5,
                cameraFixed: false
            },
            supabase,
            tryOnResultId,
            user.id
        )

        return new Response(
            JSON.stringify(result),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )
    } catch (error) {
        console.error('❌ Video generation edge function error:', error)

        // Try to refund credits if we have user and tryOnResultId
        if (supabase && user?.id && body?.tryOnResultId) {
            try {
                await supabase.rpc('refund_credits', {
                    p_user_id: user.id,
                    p_amount: 50,
                    p_description: 'Video generation refund - edge function error',
                    p_try_on_result_id: body.tryOnResultId
                })
            } catch (refundError) {
                console.error('❌ Failed to refund credits:', refundError)
            }
        }

        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})