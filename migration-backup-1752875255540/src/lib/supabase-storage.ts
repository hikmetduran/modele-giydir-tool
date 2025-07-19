import { supabase } from './supabase'

// Test function to check if storage buckets are accessible
export async function testStorageConnection() {
    console.log('🧪 Testing Supabase Storage connection...')

    try {
        // Instead of listing buckets (which might require admin permissions),
        // let's test by trying to upload a small test file to each bucket
        const requiredBuckets = ['product-images', 'try-on-results', 'model-photos']
        const testResults = []

        for (const bucket of requiredBuckets) {
            try {
                // Try to list files in the bucket (this should work with our policies)
                const { error } = await supabase.storage
                    .from(bucket)
                    .list('', { limit: 1 })

                if (error) {
                    console.log(`❌ Bucket ${bucket} error:`, error)
                    testResults.push({ bucket, success: false, error: error.message })
                } else {
                    console.log(`✅ Bucket ${bucket} accessible`)
                    testResults.push({ bucket, success: true })
                }
            } catch (err) {
                console.log(`❌ Bucket ${bucket} exception:`, err)
                testResults.push({
                    bucket,
                    success: false,
                    error: err instanceof Error ? err.message : 'Unknown error'
                })
            }
        }

        const failedBuckets = testResults.filter(r => !r.success)
        const successfulBuckets = testResults.filter(r => r.success).map(r => r.bucket)

        console.log('✅ Accessible buckets:', successfulBuckets)
        console.log('❌ Failed buckets:', failedBuckets)

        return {
            success: failedBuckets.length === 0,
            buckets: successfulBuckets,
            missingBuckets: failedBuckets.map(r => r.bucket),
            error: failedBuckets.length > 0 ?
                `Cannot access buckets: ${failedBuckets.map(r => `${r.bucket} (${r.error})`).join(', ')}` :
                null
        }

    } catch (error) {
        console.error('❌ Storage connection test failed:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            buckets: []
        }
    }
}

export interface UploadResult {
    success: boolean
    data?: {
        path: string
        url: string
        id: string
    }
    error?: string
}

export interface UploadProgress {
    loaded: number
    total: number
    percentage: number
}

// Upload a file to Supabase Storage
export async function uploadFile(
    bucket: string,
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
    const startTime = Date.now()
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    try {
        console.log(`📤 [${fileId}] Starting upload - Bucket: ${bucket}, File: ${file.name}, Size: ${file.size} bytes, User: ${userId}`)

        // Basic validation
        if (!file || file.size === 0) {
            throw new Error('Invalid file: File is empty or corrupted')
        }

        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            throw new Error(`File too large: ${file.size} bytes (max 50MB)`)
        }

        // Generate unique file name
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
        const filePath = `${userId}/${fileName}`

        console.log(`📍 [${fileId}] Upload path: ${filePath}`)

        // Report initial progress
        if (onProgress) {
            onProgress({ loaded: 0, total: file.size, percentage: 0 })
        }

        // Upload file with enhanced error handling
        console.log(`🔄 [${fileId}] Calling Supabase storage upload...`)
        const uploadStartTime = Date.now()

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            })

        const uploadDuration = Date.now() - uploadStartTime
        console.log(`⏱️ [${fileId}] Supabase upload completed in ${uploadDuration}ms`)

        console.log(`🗃️ [${fileId}] Supabase storage response:`, {
            success: !error,
            data: data ? { path: data.path, id: data.id } : null,
            error: error ? { message: error.message, details: error } : null
        })

        if (error) {
            console.error(`❌ [${fileId}] Supabase storage error:`, {
                errorMessage: error.message,
                errorCode: (error as { statusCode?: string }).statusCode || 'unknown',
                errorDetails: error,
                uploadDuration
            })

            // Provide more specific error messages
            let userFriendlyError = error.message
            if (error.message.includes('Duplicate')) {
                userFriendlyError = 'File already exists. Please rename your file or try again.'
            } else if (error.message.includes('size')) {
                userFriendlyError = 'File is too large. Please use a smaller file.'
            } else if (error.message.includes('type')) {
                userFriendlyError = 'File type not supported. Please use JPG, PNG, or WEBP.'
            } else if (error.message.includes('permission') || error.message.includes('policy')) {
                userFriendlyError = 'Permission denied. Please check your account settings.'
            }

            throw new Error(`Storage error: ${userFriendlyError}`)
        }

        if (!data) {
            throw new Error('Storage upload succeeded but no data returned')
        }

        // Report completion progress
        if (onProgress) {
            onProgress({ loaded: file.size, total: file.size, percentage: 100 })
        }

        // Get public URL
        console.log(`🔗 [${fileId}] Getting public URL...`)
        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath)

        const publicUrl = urlData.publicUrl
        console.log(`✅ [${fileId}] Generated public URL: ${publicUrl}`)

        // Validate URL
        if (!publicUrl || !publicUrl.startsWith('http')) {
            throw new Error(`Invalid public URL generated: ${publicUrl}`)
        }

        const totalDuration = Date.now() - startTime
        console.log(`🎉 [${fileId}] Upload fully completed in ${totalDuration}ms`)

        return {
            success: true,
            data: {
                path: filePath,
                url: publicUrl,
                id: fileName.split('.')[0]
            }
        }
    } catch (error) {
        const totalDuration = Date.now() - startTime
        console.error(`❌ [${fileId}] Upload failed after ${totalDuration}ms:`, {
            errorType: typeof error,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorObject: error,
            bucket,
            fileName: file.name,
            fileSize: file.size,
            userId
        })

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed due to unknown error'
        }
    }
}

// Download a file from Supabase Storage
export async function downloadFile(bucket: string, path: string): Promise<Blob | null> {
    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .download(path)

        if (error) {
            throw error
        }

        return data
    } catch (error) {
        console.error('Download error:', error)
        return null
    }
}

// Delete a file from Supabase Storage
export async function deleteFile(bucket: string, path: string): Promise<boolean> {
    try {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([path])

        if (error) {
            throw error
        }

        return true
    } catch (error) {
        console.error('Delete error:', error)
        return false
    }
}

// Get public URL for a file
export function getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(path)

    return data.publicUrl
}

// List files in a user's folder
export async function listUserFiles(bucket: string, userId: string) {
    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .list(userId, {
                limit: 100,
                offset: 0,
                sortBy: { column: 'created_at', order: 'desc' }
            })

        if (error) {
            throw error
        }

        return data.map(file => ({
            name: file.name,
            path: `${userId}/${file.name}`,
            url: getPublicUrl(bucket, `${userId}/${file.name}`),
            size: file.metadata?.size || 0,
            createdAt: file.created_at
        }))
    } catch (error) {
        console.error('List files error:', error)
        return []
    }
}

// Upload product image and save to database
export async function uploadProductImage(file: File, userId: string) {
    const startTime = Date.now()
    const operationId = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

    try {
        console.log(`🔄 [${operationId}] Starting product image upload - File: ${file.name}, User: ${userId}`)

        // Enhanced validation
        if (!file) {
            throw new Error('No file provided')
        }

        if (!userId) {
            throw new Error('User ID is required')
        }

        if (!file.type.startsWith('image/')) {
            throw new Error(`Invalid file type: ${file.type}. Only images are supported.`)
        }

        // Validate file size (more detailed)
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
            throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max ${maxSize / 1024 / 1024}MB)`)
        }

        if (file.size < 1024) { // Less than 1KB
            throw new Error('File too small. Please use a larger image.')
        }

        // Upload to storage
        console.log(`📁 [${operationId}] Uploading to storage...`)
        const uploadResult = await uploadFile('product-images', file, userId)

        console.log(`📁 [${operationId}] Storage upload result:`, {
            success: uploadResult.success,
            hasData: !!uploadResult.data,
            error: uploadResult.error
        })

        if (!uploadResult.success || !uploadResult.data) {
            throw new Error(uploadResult.error || 'Storage upload failed - no data returned')
        }

        console.log(`💾 [${operationId}] Saving to database...`)
        const dbStartTime = Date.now()

        // Save to database
        const { data, error } = await supabase
            .from('product_images')
            .insert([
                {
                    user_id: userId,
                    original_filename: file.name,
                    image_url: uploadResult.data.url,
                    image_path: uploadResult.data.path,
                    file_size: file.size,
                    mime_type: file.type,
                    // We'll add width/height later if needed
                }
            ])
            .select()
            .single()

        const dbDuration = Date.now() - dbStartTime
        console.log(`🗄️ [${operationId}] Database save completed in ${dbDuration}ms`)

        console.log(`🗄️ [${operationId}] Database save result:`, {
            success: !error,
            hasData: !!data,
            error: error ? { message: error.message, code: error.code } : null
        })

        if (error) {
            console.error(`❌ [${operationId}] Database save failed:`, {
                errorMessage: error.message,
                errorCode: error.code,
                errorDetails: error
            })

            // Clean up uploaded file if database save fails
            console.log(`🧹 [${operationId}] Cleaning up uploaded file due to database error...`)
            await deleteFile('product-images', uploadResult.data.path)

            // Provide user-friendly error message
            let userFriendlyError = error.message
            if (error.code === '23505') { // Unique constraint violation
                userFriendlyError = 'This file has already been uploaded. Please try a different file.'
            } else if (error.code === '23503') { // Foreign key constraint
                userFriendlyError = 'Account validation failed. Please sign out and sign in again.'
            } else if (error.code === '42501') { // Insufficient privileges
                userFriendlyError = 'Permission denied. Please check your account settings.'
            }

            throw new Error(`Database error: ${userFriendlyError}`)
        }

        if (!data) {
            throw new Error('Database save succeeded but no data returned')
        }

        const totalDuration = Date.now() - startTime
        console.log(`✅ [${operationId}] Product image upload completed successfully in ${totalDuration}ms`)

        return {
            success: true,
            data: {
                ...data,
                image_url: uploadResult.data.url // Ensure we return the correct URL
            }
        }
    } catch (error) {
        const totalDuration = Date.now() - startTime
        console.error(`❌ [${operationId}] Product image upload failed after ${totalDuration}ms:`, {
            errorType: typeof error,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorObject: error,
            fileName: file.name,
            fileSize: file.size,
            userId: userId
        })

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed due to unknown error'
        }
    }
}

// Get product image database ID by user and original filename
export async function getProductImageId(userId: string, originalFilename: string): Promise<string | null> {
    try {
        console.log('🔍 Looking up product image ID for:', { userId, originalFilename })

        // Add a timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Database query timeout after 10 seconds')), 10000)
        })

        const queryPromise = supabase
            .from('product_images')
            .select('id, original_filename, created_at')
            .eq('user_id', userId)
            .eq('original_filename', originalFilename)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as { data: { id: string } | null; error: Record<string, unknown> | null }

        console.log('🗄️ Product image query result:', { data, error })

        if (error) {
            console.error('❌ Error fetching product image ID:', error)

            // If no exact match found, try a more flexible search
            if (error.code === 'PGRST116') { // No rows found
                console.log('🔄 Trying flexible search for filename...')

                const flexibleQuery = supabase
                    .from('product_images')
                    .select('id, original_filename, created_at')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(10) // Get more results to find a match

                const flexibleTimeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Flexible search timeout after 5 seconds')), 5000)
                })

                const { data: flexibleData, error: flexibleError } = await Promise.race([flexibleQuery, flexibleTimeoutPromise]) as { data: { id: string; original_filename: string }[] | null; error: Record<string, unknown> | null }

                if (flexibleError) {
                    console.error('❌ Flexible search also failed:', flexibleError)
                    return null
                }

                // Find the best match
                const match = flexibleData?.find((img: { original_filename: string }) => img.original_filename === originalFilename)
                if (match) {
                    console.log('✅ Found match with flexible search:', match.id)
                    return match.id
                }

                console.log('❌ No match found in flexible search. Available files:', flexibleData?.map((img: { original_filename: string }) => img.original_filename))
            }

            return null
        }

        return data?.id || null
    } catch (error) {
        console.error('❌ Error in getProductImageId:', error)
        return null
    }
}

// Get model photo database ID by local model ID
export async function getModelPhotoId(localModelId: string): Promise<string | null> {
    try {
        console.log('🔍 Looking up model photo ID for local model:', localModelId)

        // Add a timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Model photo query timeout after 10 seconds')), 10000)
        })

        // Look up the specific model by ID
        const queryPromise = supabase
            .from('model_photos')
            .select('id, name, is_active, sort_order')
            .eq('id', localModelId)
            .eq('is_active', true)
            .single()

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as { data: { id: string; name: string } | null; error: Record<string, unknown> | null }

        console.log('🗄️ Model photo query result:', { data, error })

        if (error) {
            console.error('❌ Error fetching model photo ID:', error)

            // Fallback: try to find by exact name match if ID lookup fails
            console.log('🔄 Fallback: trying to find model by name/description...')

            const fallbackTimeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Model photo fallback query timeout after 5 seconds')), 5000)
            })

            const fallbackQueryPromise = supabase
                .from('model_photos')
                .select('id, name, is_active, sort_order')
                .eq('is_active', true)
                .or(`name.ilike.%${localModelId}%,description.ilike.%${localModelId}%`)
                .order('sort_order', { ascending: true })
                .limit(1)
                .single()

            const { data: fallbackData, error: fallbackError } = await Promise.race([fallbackQueryPromise, fallbackTimeoutPromise]) as { data: { id: string; name: string } | null; error: Record<string, unknown> | null }

            if (fallbackError || !fallbackData) {
                console.error('❌ Fallback lookup also failed:', fallbackError)
                return null
            }

            console.log('✅ Fallback found model photo ID:', fallbackData.id, 'for local model:', localModelId)
            return fallbackData.id
        }

        console.log('✅ Found model photo ID:', data?.id, 'for local model:', localModelId)
        return data?.id || null
    } catch (error) {
        console.error('❌ Error in getModelPhotoId:', error)
        return null
    }
}

// Save AI try-on result
export async function createTryOnResult(
    userId: string,
    productImageId: string,
    modelPhotoId: string
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
    try {
        console.log('🚀 Creating try-on result record:', { userId, productImageId, modelPhotoId })

        const { data, error } = await supabase
            .from('try_on_results')
            .insert({
                user_id: userId,
                product_image_id: productImageId,
                model_photo_id: modelPhotoId,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select('id')
            .single()

        if (error) {
            console.error('❌ Failed to create try-on result record:', error)
            return {
                success: false,
                error: error.message
            }
        }

        console.log('✅ Try-on result record created:', data)
        return {
            success: true,
            data: { id: data.id }
        }
    } catch (error) {
        console.error('❌ Error creating try-on result record:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

export async function getTryOnResultStatus(
    jobId: string,
    userId: string
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('try_on_results')
            .select('*')
            .eq('id', jobId)
            .eq('user_id', userId)
            .single()

        if (error) {
            console.error('❌ Failed to get try-on result status:', error)
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
        console.error('❌ Error getting try-on result status:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

export async function saveTryOnResult(
    userId: string,
    productImageId: string,
    modelPhotoId: string,
    resultImageBlob: Blob,
    metadata?: Record<string, unknown>
) {
    const operationId = `save-result-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

    try {
        console.log(`💾 [${operationId}] Saving try-on result...`, { userId, productImageId, modelPhotoId })

        // Debug: List all product images for this user
        await debugUserProductImages(userId)

        // Get actual database IDs with timeout
        console.log(`🔍 [${operationId}] Looking up product image ID...`)
        const actualProductImageId = await getProductImageId(userId, productImageId)

        console.log(`🔍 [${operationId}] Looking up model photo ID...`)
        const actualModelPhotoId = await getModelPhotoId(modelPhotoId)

        console.log(`🔍 [${operationId}] Database ID lookup results:`, {
            actualProductImageId,
            actualModelPhotoId,
            productImageSearched: productImageId,
            modelPhotoSearched: modelPhotoId
        })

        if (!actualProductImageId) {
            throw new Error(`Product image not found for filename: ${productImageId}`)
        }

        if (!actualModelPhotoId) {
            throw new Error(`Model photo not found for ID: ${modelPhotoId}`)
        }

        console.log(`✅ [${operationId}] Found database IDs:`, { actualProductImageId, actualModelPhotoId })

        // Convert blob to file
        const file = new File([resultImageBlob], 'try-on-result.png', { type: 'image/png' })

        // Upload to storage
        const uploadResult = await uploadFile('try-on-results', file, userId)

        if (!uploadResult.success || !uploadResult.data) {
            throw new Error(uploadResult.error || 'Upload failed')
        }

        console.log('📁 Storage upload successful:', uploadResult.data.url)

        // Save to database
        const { data, error } = await supabase
            .from('try_on_results')
            .insert([
                {
                    user_id: userId,
                    product_image_id: actualProductImageId,
                    model_photo_id: actualModelPhotoId,
                    result_image_url: uploadResult.data.url,
                    result_image_path: uploadResult.data.path,
                    status: 'completed',
                    ai_provider: metadata?.ai_provider || 'mock',
                    ai_model: metadata?.ai_model || 'simulation-v1',
                    processing_time_seconds: metadata?.processing_time_seconds || 0,
                    metadata: metadata
                }
            ])
            .select()
            .single()

        if (error) {
            console.error('❌ Database save error:', error)
            // Clean up uploaded file if database save fails
            await deleteFile('try-on-results', uploadResult.data.path)
            throw error
        }

        console.log('✅ Database save successful:', data)

        return {
            success: true,
            data: {
                ...data,
                url: uploadResult.data.url
            }
        }
    } catch (error) {
        console.error(`❌ [${operationId}] Save try-on result error:`, {
            errorType: typeof error,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined,
            userId,
            productImageId,
            modelPhotoId,
            blobSize: resultImageBlob.size,
            metadata
        })
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Save failed'
        }
    }
}

// Get user's product images
export async function getUserProductImages(userId: string) {
    try {
        const { data, error } = await supabase
            .from('product_images')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) {
            throw error
        }

        return data
    } catch (error) {
        console.error('Get user product images error:', error)
        return []
    }
}

// Delete a product image from both storage and database
export async function deleteProductImage(imageId: string, userId: string) {
    try {
        console.log(`🗑️ Deleting product image: ${imageId} for user: ${userId}`)

        // First, get the image details to find the storage path
        const { data: imageData, error: fetchError } = await supabase
            .from('product_images')
            .select('image_path, image_url, original_filename')
            .eq('id', imageId)
            .eq('user_id', userId)
            .single()

        if (fetchError) {
            console.error('❌ Error fetching image details:', fetchError)
            throw new Error(`Failed to fetch image details: ${fetchError.message}`)
        }

        if (!imageData) {
            throw new Error('Image not found or access denied')
        }

        console.log(`📁 Deleting from storage: ${imageData.image_path}`)

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from('product-images')
            .remove([imageData.image_path])

        if (storageError) {
            console.error('❌ Error deleting from storage:', storageError)
            // Don't throw here - continue with database deletion even if storage fails
        }

        // Delete from database
        const { error: dbError } = await supabase
            .from('product_images')
            .delete()
            .eq('id', imageId)
            .eq('user_id', userId)

        if (dbError) {
            console.error('❌ Error deleting from database:', dbError)
            throw new Error(`Failed to delete from database: ${dbError.message}`)
        }

        console.log(`✅ Successfully deleted image: ${imageData.original_filename}`)
        return { success: true }

    } catch (error) {
        console.error('❌ Delete product image error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Delete failed'
        }
    }
}

// Get user's try-on results
export async function getUserTryOnResults(userId: string) {
    try {
        const { data, error } = await supabase
            .from('try_on_results')
            .select(`
                *,
                product_images!inner(original_filename, image_url),
                model_photos!inner(name, image_url)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) {
            throw error
        }

        return data
    } catch (error) {
        console.error('Get user try-on results error:', error)
        return []
    }
}

// Enhanced function to get user's try-on results with detailed information for gallery
export async function getUserTryOnResultsForGallery(userId: string, limit?: number, offset?: number) {
    try {
        let query = supabase
            .from('try_on_results')
            .select(`
                id,
                created_at,
                updated_at,
                status,
                result_image_url,
                ai_provider,
                ai_model,
                processing_time_seconds,
                metadata,
                product_images!inner(
                    id,
                    original_filename,
                    image_url,
                    file_size,
                    created_at
                ),
                model_photos!inner(
                    id,
                    name,
                    image_url,
                    description,
                    gender,
                    body_type
                )
            `)
            .eq('user_id', userId)
            .eq('status', 'completed')
            .not('result_image_url', 'is', null)
            .order('created_at', { ascending: false })

        if (limit) {
            query = query.limit(limit)
        }

        if (offset) {
            query = query.range(offset, offset + (limit || 10) - 1)
        }

        const { data, error } = await query

        if (error) {
            throw error
        }

        return {
            success: true,
            data: data || [],
            count: data?.length || 0
        }
    } catch (error) {
        console.error('Get user try-on results for gallery error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: [],
            count: 0
        }
    }
}

// Get user's try-on results count for pagination
export async function getUserTryOnResultsCount(userId: string) {
    try {
        const { count, error } = await supabase
            .from('try_on_results')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'completed')
            .not('result_image_url', 'is', null)

        if (error) {
            throw error
        }

        return {
            success: true,
            count: count || 0
        }
    } catch (error) {
        console.error('Get user try-on results count error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            count: 0
        }
    }
}

// Search user's try-on results
export async function searchUserTryOnResults(userId: string, searchTerm: string, limit?: number) {
    try {
        const { data, error } = await supabase
            .from('try_on_results')
            .select(`
                id,
                created_at,
                updated_at,
                status,
                result_image_url,
                ai_provider,
                ai_model,
                processing_time_seconds,
                metadata,
                product_images!inner(
                    id,
                    original_filename,
                    image_url,
                    file_size,
                    created_at
                ),
                model_photos!inner(
                    id,
                    name,
                    image_url,
                    description,
                    gender,
                    body_type
                )
            `)
            .eq('user_id', userId)
            .eq('status', 'completed')
            .not('result_image_url', 'is', null)
            .or(`product_images.original_filename.ilike.%${searchTerm}%,model_photos.name.ilike.%${searchTerm}%`)
            .order('created_at', { ascending: false })
            .limit(limit || 50)

        if (error) {
            throw error
        }

        return {
            success: true,
            data: data || []
        }
    } catch (error) {
        console.error('Search user try-on results error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: []
        }
    }
}

// Get user's try-on results grouped by date
export async function getUserTryOnResultsGroupedByDate(userId: string) {
    try {
        const { data, error } = await supabase
            .from('try_on_results')
            .select(`
                id,
                created_at,
                updated_at,
                status,
                result_image_url,
                ai_provider,
                ai_model,
                processing_time_seconds,
                metadata,
                product_images!inner(
                    id,
                    original_filename,
                    image_url,
                    file_size,
                    created_at
                ),
                model_photos!inner(
                    id,
                    name,
                    image_url,
                    description,
                    gender,
                    body_type
                )
            `)
            .eq('user_id', userId)
            .eq('status', 'completed')
            .not('result_image_url', 'is', null)
            .order('created_at', { ascending: false })

        if (error) {
            throw error
        }

        return {
            success: true,
            data: data || []
        }
    } catch (error) {
        console.error('Get user try-on results grouped by date error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: []
        }
    }
}

// Debug: List all product images for a user
export async function debugUserProductImages(userId: string) {
    console.log('🔍 DEBUG: Listing all product images for user:', userId)

    try {
        const { data, error } = await supabase
            .from('product_images')
            .select('id, original_filename, created_at, image_url')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20)

        console.log('🗄️ DEBUG: User product images:', { data, error })

        if (data) {
            console.log('📋 DEBUG: Available filenames:', data.map(img => img.original_filename))
        }

        return { data, error }
    } catch (error) {
        console.error('❌ DEBUG: Error listing product images:', error)
        return { data: null, error }
    }
}

// Test database connection and schema
export async function testDatabaseConnection() {
    console.log('🧪 Testing database connection and schema...')

    try {
        // Test model_photos table
        const { data: modelPhotos, error: modelError } = await supabase
            .from('model_photos')
            .select('*')
            .limit(5)

        console.log('📊 Model photos table:', { data: modelPhotos, error: modelError })

        // Test product_images table  
        const { data: productImages, error: productError } = await supabase
            .from('product_images')
            .select('*')
            .limit(5)

        console.log('📊 Product images table:', { data: productImages, error: productError })

        // Test try_on_results table
        const { data: tryOnResults, error: tryOnError } = await supabase
            .from('try_on_results')
            .select('*')
            .limit(5)

        console.log('📊 Try-on results table:', { data: tryOnResults, error: tryOnError })

        return {
            success: !modelError && !productError && !tryOnError,
            modelPhotos: modelPhotos?.length || 0,
            productImages: productImages?.length || 0,
            tryOnResults: tryOnResults?.length || 0,
            errors: [modelError, productError, tryOnError].filter(Boolean)
        }

    } catch (error) {
        console.error('❌ Database test failed:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
} 