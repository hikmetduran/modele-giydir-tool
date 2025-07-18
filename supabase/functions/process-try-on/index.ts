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

const FAL_API_KEY = Deno.env.get('FAL_API_KEY')

// Configure Fal.ai client
if (FAL_API_KEY) {
    fal.config({
        credentials: FAL_API_KEY
    })
} else {
    console.error('❌ FAL_API_KEY environment variable not set')
}

interface TryOnRequest {
    productImageId: string
    modelPhotoId: string
    jobId: string
}

interface TryOnInput {
    modelImageUrl: string
    garmentImageUrl: string
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
                garment_image: input.garmentImageUrl
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
    supabaseAdmin: any,
    jobId: string,
    userId: string
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
                await supabaseAdmin.rpc('refund_credits', {
                    p_user_id: userId,
                    p_amount: 10,
                    p_description: 'Try-on generation refund - processing failed',
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
            await supabaseAdmin.rpc('refund_credits', {
                p_user_id: userId,
                p_amount: 10,
                p_description: 'Try-on generation refund - request timed out',
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
            const fileName = `try-on-result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`
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
            await supabaseAdmin.rpc('refund_credits', {
                p_user_id: userId,
                p_amount: 10,
                p_description: 'Try-on generation refund - no result image found',
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
        await supabaseAdmin.rpc('refund_credits', {
            p_user_id: userId,
            p_amount: 10,
            p_description: 'Try-on generation refund - processing exception',
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

    let user: any = null
    let body: TryOnRequest | null = null

    try {
        // Debug: Log all headers
        console.log('🔍 Debug: Request headers:', {
            authorization: req.headers.get('Authorization'),
            'x-client-info': req.headers.get('x-client-info'),
            apikey: req.headers.get('apikey')
        })

        // Get the authorization header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            console.log('❌ No authorization header found')
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Missing authorization header'
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 401
                }
            )
        }

        console.log('🔍 Authorization header found:', authHeader.substring(0, 20) + '...')

        // Validate Bearer token format
        if (!authHeader.startsWith('Bearer ')) {
            console.log('❌ Invalid authorization format')
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Invalid authorization format. Expected: Bearer <token>'
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 401
                }
            )
        }

        console.log('✅ Bearer token format is valid')

        // Debug: Check environment variables
        console.log('🔍 Environment variables:', {
            SUPABASE_URL: Deno.env.get('SUPABASE_URL') ? 'Set' : 'Missing',
            SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY') ? 'Set' : 'Missing',
            SERVICE_ROLE_KEY: Deno.env.get('SERVICE_ROLE_KEY') ? 'Set' : 'Missing'
        })

        // Create Supabase client with service role key for admin operations
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Create Supabase client with user auth for user-specific operations
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: { headers: { Authorization: authHeader } },
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        console.log('✅ Supabase clients created successfully')

        // New authentication approach for new API key system
        let authUser: any = null
        let authError: any = null

        console.log('🔍 Attempting authentication with new API key system...')
        try {
            const token = authHeader.replace('Bearer ', '')
            
            // Use the service role key to verify the JWT directly
            const authResult = await supabaseAdmin.auth.getUser(token)
            
            if (authResult.data?.user && !authResult.error) {
                authUser = authResult.data.user
                console.log('✅ Authentication successful with new API key system')
            } else {
                authError = authResult.error
                console.log('❌ Authentication failed:', authResult.error)
            }
        } catch (error) {
            console.log('❌ Authentication error:', error)
            authError = error
        }

        // Final authentication check
        if (!authUser) {
            console.error('❌ Authentication failed:', {
                message: authError?.message || 'Authentication failed - please check your session',
                status: authError?.status,
                code: authError?.code
            })
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Authentication failed: ${authError?.message || 'Please ensure you are logged in'}`,
                    details: {
                        status: authError?.status,
                        code: authError?.code,
                        message: 'This function requires a valid user session. Please log in again.'
                    }
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 401
                }
            )
        }

        console.log('✅ User authenticated successfully:', {
            id: authUser.id,
            email: authUser.email,
            role: authUser.role
        })

        user = authUser

        // Parse request body
        console.log('🔍 Parsing request body...')
        try {
            body = await req.json()
            console.log('✅ Request body parsed successfully:', body)
        } catch (parseError) {
            console.error('❌ Failed to parse request body:', parseError)
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Invalid JSON in request body',
                    details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
                }
            )
        }

        if (!body) {
            console.log('❌ Request body is null/undefined')
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Request body is required'
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
                }
            )
        }

        const { productImageId, modelPhotoId, jobId } = body
        console.log('🔍 Extracted fields:', { productImageId, modelPhotoId, jobId })

        // Validate required fields
        const missingFields: string[] = []
        if (!productImageId) missingFields.push('productImageId')
        if (!modelPhotoId) missingFields.push('modelPhotoId')
        if (!jobId) missingFields.push('jobId')

        if (missingFields.length > 0) {
            console.log('❌ Missing required fields:', missingFields)
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Missing required fields: ${missingFields.join(', ')}`,
                    received: { productImageId, modelPhotoId, jobId }
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
                }
            )
        }

        // Validate field formats (basic UUID validation)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        const invalidFields: string[] = []
        if (!uuidRegex.test(productImageId)) invalidFields.push('productImageId')
        if (!uuidRegex.test(modelPhotoId)) invalidFields.push('modelPhotoId')
        if (!uuidRegex.test(jobId)) invalidFields.push('jobId')

        if (invalidFields.length > 0) {
            console.log('❌ Invalid field formats:', invalidFields)
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Invalid UUID format for fields: ${invalidFields.join(', ')}`,
                    received: { productImageId, modelPhotoId, jobId }
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
                }
            )
        }

        console.log('✅ All field validation passed')
        console.log('🚀 Processing try-on request:', { productImageId, modelPhotoId, jobId, userId: user.id })

        // Check user's credit balance and deduct credits before processing (using admin client)
        console.log('🔍 Attempting to deduct credits...')
        const { data: deductResult, error: deductError } = await supabaseAdmin.rpc('deduct_credits', {
            p_user_id: user.id,
            p_amount: 10,
            p_description: 'Try-on generation',
            p_try_on_result_id: jobId
        })

        if (deductError) {
            console.error('❌ Error deducting credits:', deductError)
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Credit deduction failed',
                    details: deductError.message || 'Unknown credit error'
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
                }
            )
        }

        if (!deductResult) {
            console.error('❌ Insufficient credits for user:', user.id)
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Insufficient credits',
                    details: 'You need at least 10 credits to process a try-on request'
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
                }
            )
        }

        console.log('✅ Credits deducted successfully for user:', user.id)

        // Get product image details (using user client)
        console.log('🔍 Looking up product image...')
        const { data: productImage, error: productError } = await supabase
            .from('product_images')
            .select('*')
            .eq('id', productImageId)
            .eq('user_id', user.id)
            .single()

        if (productError || !productImage) {
            console.error('❌ Product image not found:', { productImageId, userId: user.id, error: productError })
            // Refund credits if product image not found (using admin client)
            await supabaseAdmin.rpc('refund_credits', {
                p_user_id: user.id,
                p_amount: 10,
                p_description: 'Try-on generation refund - product image not found',
                p_try_on_result_id: jobId
            })
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Product image not found',
                    details: `Product image with ID ${productImageId} not found for user ${user.id}`
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
                }
            )
        }

        console.log('✅ Product image found:', { id: productImage.id, filename: productImage.filename })

        // Get model photo details (using user client)
        console.log('🔍 Looking up model photo...')
        const { data: modelPhoto, error: modelError } = await supabase
            .from('model_photos')
            .select('*')
            .eq('id', modelPhotoId)
            .single()

        if (modelError || !modelPhoto) {
            console.error('❌ Model photo not found:', { modelPhotoId, error: modelError })
            // Refund credits if model photo not found (using admin client)
            await supabaseAdmin.rpc('refund_credits', {
                p_user_id: user.id,
                p_amount: 10,
                p_description: 'Try-on generation refund - model photo not found',
                p_try_on_result_id: jobId
            })
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Model photo not found',
                    details: `Model photo with ID ${modelPhotoId} not found`
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
                }
            )
        }

        console.log('✅ Model photo found:', { id: modelPhoto.id, name: modelPhoto.name })

        // Process the try-on request
        const result = await processTryOnWithUpdates(
            {
                modelImageUrl: modelPhoto.image_url,
                garmentImageUrl: productImage.image_url
            },
            supabase,
            supabaseAdmin,
            jobId,
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
        console.error('❌ Edge function error:', error)

        // Try to refund credits if we have user and jobId
        if (user?.id && body?.jobId) {
            try {
                // Create admin client for refund
                const supabaseAdmin = createClient(
                    Deno.env.get('SUPABASE_URL') ?? '',
                    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                )

                await supabaseAdmin.rpc('refund_credits', {
                    p_user_id: user.id,
                    p_amount: 10,
                    p_description: 'Try-on generation refund - edge function error',
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
