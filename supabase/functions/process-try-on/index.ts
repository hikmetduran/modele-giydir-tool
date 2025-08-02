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

interface TryOnRequest {
    productImageId: string
    modelPhotoId: string
    jobId: string
    category?: string
    isRegeneration?: boolean
}

interface TryOnInput {
    modelImageUrl: string
    garmentImageUrl: string
    category?: string
}

interface TryOnResult {
    success: boolean
    resultUrl?: string
    requestId?: string
    error?: string
}

interface ProcessingStatus {
    status: 'queued' | 'processing' | 'completed' | 'failed'
    progress: number
    message?: string
}

/**
 * Submit a try-on request to Fal AI Queue
 */
async function submitTryOnRequest(input: TryOnInput): Promise<{ requestId: string } | { error: string }> {
    try {
        console.log('🚀 Submitting try-on request to Fal AI...')

        const { request_id } = await fal.queue.submit("fal-ai/fashn/tryon/v1.6", {
            input: {
                model_image: input.modelImageUrl,
                garment_image: input.garmentImageUrl,
                category: input.category || "auto",
                mode: "quality",
                output_format: "png",
                seed: Math.floor(Math.random() * 100000000) + 1
            }
        })

        console.log('✅ Request submitted successfully:', request_id)
        return { requestId: request_id }
    } catch (error) {
        console.error('❌ Failed to submit try-on request:', error)
        return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Check the status of a try-on request
 */
async function checkTryOnStatus(requestId: string): Promise<ProcessingStatus> {
    try {
        const status = await fal.queue.status("fal-ai/fashn/tryon/v1.6", {
            requestId: requestId,
            logs: true,
        })

        console.log('📊 Status check response:', status)

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

        let message = 'Processing...'
        if (status.logs && status.logs.length > 0) {
            message = status.logs[status.logs.length - 1]?.message || 'Processing...'
        }

        return {
            status: mappedStatus,
            progress,
            message
        }
    } catch (error) {
        console.error('❌ Failed to check try-on status:', error)
        return {
            status: 'failed',
            progress: 0,
            message: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Get the result of a completed try-on request
 */
async function getTryOnResult(requestId: string): Promise<TryOnResult> {
    try {
        console.log('📥 Getting try-on result for request:', requestId)

        const result = await fal.queue.result("fal-ai/fashn/tryon/v1.6", {
            requestId: requestId
        })

        console.log('✅ Result received:', result)

        // For Fashn Try-On v1.6, the response structure is result.data.images[0].url
        if (result.data?.images && result.data.images.length > 0 && result.data.images[0].url) {
            return {
                success: true,
                resultUrl: result.data.images[0].url,
                requestId
            }
        } else {
            return {
                success: false,
                error: 'No result image found',
                requestId
            }
        }
    } catch (error) {
        console.error('❌ Failed to get try-on result:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId
        }
    }
}

/**
 * Process a try-on request with real-time status updates
 */
async function processTryOnWithUpdates(
    input: TryOnInput,
    supabase: any,
    jobId: string,
    userId: string,
    creditCost: number = 10
): Promise<TryOnResult> {
    try {
        // Update job status to processing
        await supabase
            .from('try_on_results')
            .update({
                status: 'processing',
                updated_at: new Date().toISOString()
            })
            .eq('id', jobId)

        // Submit the request
        const submission = await submitTryOnRequest(input)

        if ('error' in submission) {
            // Update job status to failed
            await supabase
                .from('try_on_results')
                .update({
                    status: 'failed',
                    error_message: submission.error,
                    updated_at: new Date().toISOString()
                })
                .eq('id', jobId)

            return {
                success: false,
                error: submission.error
            }
        }

        const { requestId } = submission

        // Poll for status updates
        let isCompleted = false
        let attempts = 0
        const maxAttempts = 120 // 10 minutes max (5 second intervals)

        while (!isCompleted && attempts < maxAttempts) {
            const status = await checkTryOnStatus(requestId)

            if (status.status === 'completed') {
                isCompleted = true
                break
            } else if (status.status === 'failed') {
                // Refund credits when processing fails
                await supabase.rpc('refund_credits', {
                    p_user_id: userId,
                    p_amount: creditCost,
                    p_description: `Try-on ${creditCost === 5 ? 'regeneration' : 'generation'} refund - processing failed`,
                    p_try_on_result_id: jobId
                })

                // Update job status to failed
                await supabase
                    .from('try_on_results')
                    .update({
                        status: 'failed',
                        error_message: status.message || 'Processing failed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', jobId)

                return {
                    success: false,
                    error: status.message || 'Processing failed',
                    requestId
                }
            }

            attempts++
            await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
        }

        if (!isCompleted) {
            // Refund credits when request times out
            await supabase.rpc('refund_credits', {
                p_user_id: userId,
                p_amount: creditCost,
                p_description: `Try-on ${creditCost === 5 ? 'regeneration' : 'generation'} refund - request timed out`,
                p_try_on_result_id: jobId
            })

            // Update job status to failed
            await supabase
                .from('try_on_results')
                .update({
                    status: 'failed',
                    error_message: 'Request timed out',
                    updated_at: new Date().toISOString()
                })
                .eq('id', jobId)

            return {
                success: false,
                error: 'Request timed out',
                requestId
            }
        }

        // Get the final result
        const result = await getTryOnResult(requestId)

        if (result.success && result.resultUrl) {
            // Download the result image
            const response = await fetch(result.resultUrl)
            const blob = await response.blob()

            // Generate unique filename
            const fileName = `try-on-result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`
            const filePath = `${userId}/${fileName}`

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('try-on-results')
                .upload(filePath, blob, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) {
                console.error('❌ Failed to upload result to storage:', uploadError)
                // Update job with external URL as fallback
                await supabase
                    .from('try_on_results')
                    .update({
                        status: 'completed',
                        result_image_url: result.resultUrl,
                        ai_provider: 'fal-ai',
                        ai_model: 'fashn-tryon-v1.6',
                        processing_time_seconds: 0,
                        error_message: `Storage upload failed: ${uploadError.message}`,
                        metadata: {
                            ai_provider: 'fal-ai',
                            ai_model: 'fashn-tryon-v1.6',
                            fal_request_id: requestId
                        },
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', jobId)

                return {
                    success: true,
                    resultUrl: result.resultUrl,
                    requestId
                }
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('try-on-results')
                .getPublicUrl(filePath)

            const publicUrl = urlData.publicUrl

            // Update job status to completed
            await supabase
                .from('try_on_results')
                .update({
                    status: 'completed',
                    result_image_url: publicUrl,
                    result_image_path: filePath,
                    ai_provider: 'fal-ai',
                    ai_model: 'fashn-tryon-v1.6',
                    processing_time_seconds: 0,
                    metadata: {
                        ai_provider: 'fal-ai',
                        ai_model: 'fashn-tryon-v1.6',
                        fal_request_id: requestId
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', jobId)

            return {
                success: true,
                resultUrl: publicUrl,
                requestId
            }
        } else {
            // Refund credits when no result image found
            await supabase.rpc('refund_credits', {
                p_user_id: userId,
                p_amount: creditCost,
                p_description: `Try-on ${creditCost === 5 ? 'regeneration' : 'generation'} refund - no result image found`,
                p_try_on_result_id: jobId
            })

            // Update job status to failed
            await supabase
                .from('try_on_results')
                .update({
                    status: 'failed',
                    error_message: result.error || 'No result image found',
                    updated_at: new Date().toISOString()
                })
                .eq('id', jobId)

            return {
                success: false,
                error: result.error || 'No result image found',
                requestId
            }
        }
    } catch (error) {
        console.error('❌ Try-on processing failed:', error)

        // Refund credits when processing fails with exception
        await supabase.rpc('refund_credits', {
            p_user_id: userId,
            p_amount: creditCost,
            p_description: `Try-on ${creditCost === 5 ? 'regeneration' : 'generation'} refund - processing exception`,
            p_try_on_result_id: jobId
        })

        // Update job status to failed
        await supabase
            .from('try_on_results')
            .update({
                status: 'failed',
                error_message: error instanceof Error ? error.message : 'Unknown error',
                updated_at: new Date().toISOString()
            })
            .eq('id', jobId)

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
    let body: TryOnRequest | undefined

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
        body = await req.json() as TryOnRequest
        const { productImageId, modelPhotoId, jobId, category, isRegeneration } = body

        console.log('🚀 Processing try-on request:', {
            productImageId,
            modelPhotoId,
            jobId,
            category,
            isRegeneration,
            userId: user.id
        })

        // Determine credit cost based on whether this is a regeneration
        const creditCost = isRegeneration ? 5 : 10
        const description = isRegeneration ? 'Try-on regeneration' : 'Try-on generation'

        // Check user's credit balance and deduct credits before processing
        const { data: deductResult, error: deductError } = await supabase.rpc('deduct_credits', {
            p_user_id: user.id,
            p_amount: creditCost,
            p_description: description,
            p_try_on_result_id: jobId
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

        // Get product image details
        const { data: productImage, error: productError } = await supabase
            .from('product_images')
            .select('*')
            .eq('id', productImageId)
            .eq('user_id', user.id)
            .single()

        if (productError || !productImage) {
            // Refund credits if product image not found
            await supabase.rpc('refund_credits', {
                p_user_id: user.id,
                p_amount: creditCost,
                p_description: `${description} refund - product image not found`,
                p_try_on_result_id: jobId
            })
            throw new Error('Product image not found')
        }

        // Get model photo details
        const { data: modelPhoto, error: modelError } = await supabase
            .from('model_photos')
            .select('*')
            .eq('id', modelPhotoId)
            .single()

        if (modelError || !modelPhoto) {
            // Refund credits if model photo not found
            await supabase.rpc('refund_credits', {
                p_user_id: user.id,
                p_amount: creditCost,
                p_description: `${description} refund - model photo not found`,
                p_try_on_result_id: jobId
            })
            throw new Error('Model photo not found')
        }

        // Process the try-on request
        const result = await processTryOnWithUpdates(
            {
                modelImageUrl: modelPhoto.image_url,
                garmentImageUrl: productImage.image_url,
                category: category
            },
            supabase,
            jobId,
            user.id,
            creditCost
        )

        return new Response(
            JSON.stringify(result),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )
    } catch (error) {
        console.error('❌ Edge function error:', error)

        // Try to refund credits if we have user and jobId
        if (supabase && user?.id && body?.jobId) {
            try {
                const errorCreditCost = body.isRegeneration ? 5 : 10
                await supabase.rpc('refund_credits', {
                    p_user_id: user.id,
                    p_amount: errorCreditCost,
                    p_description: `Try-on ${errorCreditCost === 5 ? 'regeneration' : 'generation'} refund - edge function error`,
                    p_try_on_result_id: body.jobId
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