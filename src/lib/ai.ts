import { fal } from '@fal-ai/client'

// Configure Fal AI client
fal.config({
    credentials: process.env.FAL_KEY || process.env.FAL_API_KEY
})

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

/**
 * Submit a try-on request to Fal AI
 * Returns immediately with a request ID for status checking
 */
export async function submitTryOnRequest(input: TryOnInput): Promise<{ requestId: string } | { error: string }> {
    try {
        console.log('🚀 Submitting try-on request to Fal AI...')
        const randomSeed = Math.floor(Math.random() * 10000)

        const result = await fal.queue.submit('fal-ai/fashn/tryon/v1.6', {
            input: {
                model_image: input.modelImageUrl,
                garment_image: input.garmentImageUrl,
                category: 'tops',
                mode: 'quality',
                seed: randomSeed
            }
        })

        console.log('✅ Request submitted successfully:', result.request_id)

        return { requestId: result.request_id }
    } catch (error) {
        console.error('❌ Failed to submit try-on request:', error)
        return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Check the status of a try-on request
 */
export async function checkTryOnStatus(requestId: string): Promise<ProcessingStatus> {
    try {
        const status = await fal.queue.status('fal-ai/fashn/tryon/v1.6', {
            requestId,
            logs: true
        })

        // Map Fal AI status to our status
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

        // Get the latest log message if available
        let message = 'Processing...'
        if ('logs' in status && status.logs && status.logs.length > 0) {
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
export async function getTryOnResult(requestId: string): Promise<TryOnResult> {
    try {
        console.log('📥 Getting try-on result for request:', requestId)

        const result = await fal.queue.result('fal-ai/fashn/tryon/v1.6', {
            requestId
        })

        console.log('✅ Result received:', result)

        if (result.data?.images?.[0]?.url) {
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
 * This is a high-level function that handles the complete workflow
 */
export async function processTryOnWithUpdates(
    input: TryOnInput,
    onStatusUpdate: (status: ProcessingStatus) => void
): Promise<TryOnResult> {
    try {
        // Submit the request
        const submission = await submitTryOnRequest(input)

        if ('error' in submission) {
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
            onStatusUpdate(status)

            if (status.status === 'completed') {
                isCompleted = true
                break
            } else if (status.status === 'failed') {
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
            return {
                success: false,
                error: 'Request timed out',
                requestId
            }
        }

        // Get the final result
        return await getTryOnResult(requestId)
    } catch (error) {
        console.error('❌ Try-on processing failed:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
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

// Video Generation Types and Functions

export interface VideoGenerationInput {
    imageUrl: string
    prompt?: string
    resolution?: '480p' | '720p' | '1080p'
    duration?: number
    cameraFixed?: boolean
}

export interface VideoGenerationResult {
    success: boolean
    videoUrl?: string
    requestId?: string
    error?: string
}

/**
 * Submit a video generation request to Fal AI using ByteDance SeedDance
 */
export async function submitVideoGenerationRequest(input: VideoGenerationInput): Promise<{ requestId: string } | { error: string }> {
    try {
        console.log('🎬 Submitting video generation request to Fal AI...')
        
        const result = await fal.queue.submit('fal-ai/bytedance/seedance/v1/lite/image-to-video', {
            input: {
                image_url: input.imageUrl,
                prompt: input.prompt || "fashion model, very subtle turning movements",
                resolution: input.resolution || "480p",
                duration: input.duration || 5,
                camera_fixed: input.cameraFixed || false
            }
        })

        console.log('✅ Video generation request submitted successfully:', result.request_id)
        return { requestId: result.request_id }
    } catch (error) {
        console.error('❌ Failed to submit video generation request:', error)
        return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Check the status of a video generation request
 */
export async function checkVideoGenerationStatus(requestId: string): Promise<ProcessingStatus> {
    try {
        const status = await fal.queue.status('fal-ai/bytedance/seedance/v1/lite/image-to-video', {
            requestId,
            logs: true
        })

        // Map Fal AI status to our status
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

        // Get the latest log message if available
        let message = 'Generating video...'
        if ('logs' in status && status.logs && status.logs.length > 0) {
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
export async function getVideoGenerationResult(requestId: string): Promise<VideoGenerationResult> {
    try {
        console.log('📥 Getting video generation result for request:', requestId)

        const result = await fal.queue.result('fal-ai/bytedance/seedance/v1/lite/image-to-video', {
            requestId
        })

        console.log('✅ Video result received:', result)

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
export async function processVideoGenerationWithUpdates(
    input: VideoGenerationInput,
    onStatusUpdate: (status: ProcessingStatus) => void
): Promise<VideoGenerationResult> {
    try {
        // Submit the request
        const submission = await submitVideoGenerationRequest(input)

        if ('error' in submission) {
            return {
                success: false,
                error: submission.error
            }
        }

        const { requestId } = submission

        // Poll for status updates
        let isCompleted = false
        let attempts = 0
        const maxAttempts = 240 // 20 minutes max (5 second intervals) - videos take longer

        while (!isCompleted && attempts < maxAttempts) {
            const status = await checkVideoGenerationStatus(requestId)
            onStatusUpdate(status)

            if (status.status === 'completed') {
                isCompleted = true
                break
            } else if (status.status === 'failed') {
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
            return {
                success: false,
                error: 'Video generation timed out',
                requestId
            }
        }

        // Get the final result
        return await getVideoGenerationResult(requestId)
    } catch (error) {
        console.error('❌ Video generation processing failed:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}