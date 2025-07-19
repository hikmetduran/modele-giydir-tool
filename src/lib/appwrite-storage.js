import { storage, databases, COLLECTIONS, STORAGE_BUCKET_ID } from './appwrite.js'
import { Query } from 'appwrite'

// Test function to check if storage is accessible
export async function testStorageConnection() {
    console.log('🧪 Testing Appwrite Storage connection...')

    try {
        // Test storage bucket
        const bucketData = await storage.getBucket(STORAGE_BUCKET_ID)
        
        console.log('✅ Storage bucket accessible:', bucketData.name)
        
        // Test listing files
        const filesData = await storage.listFiles(STORAGE_BUCKET_ID)
        
        console.log('✅ Files listing accessible, found:', filesData.total || 0, 'files')
        
        return {
            success: true,
            bucket: bucketData.name,
            files: filesData.total || 0
        }

    } catch (error) {
        console.error('❌ Storage test failed:', error)
        return {
            success: false,
            error: error.message || 'Unknown error'
        }
    }
}

// Upload a file to Appwrite Storage
export async function uploadFile(
    folder,
    file,
    userId,
    onProgress
) {
    const startTime = Date.now()
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    try {
        console.log(`📤 [${fileId}] Starting upload - Folder: ${folder}, File: ${file.name}, Size: ${file.size} bytes, User: ${userId}`)

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
        const filePath = `${folder}/${userId}/${fileName}`

        console.log(`📍 [${fileId}] Upload path: ${filePath}`)

        // Report initial progress
        if (onProgress) {
            onProgress({ loaded: 0, total: file.size, percentage: 0 })
        }

        // Upload file
        console.log(`🔄 [${fileId}] Calling Appwrite storage upload...`)
        const uploadStartTime = Date.now()

        const { data, error } = await storage.createFile(
            STORAGE_BUCKET_ID,
            fileId,
            file
        )

        const uploadDuration = Date.now() - uploadStartTime
        console.log(`⏱️ [${fileId}] Appwrite upload completed in ${uploadDuration}ms`)

        if (error) {
            console.error(`❌ [${fileId}] Appwrite storage error:`, {
                errorMessage: error.message,
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
        const { data: urlData } = storage.getFileView(STORAGE_BUCKET_ID, fileId)

        const publicUrl = urlData.href
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
                id: fileId
            }
        }
    } catch (error) {
        const totalDuration = Date.now() - startTime
        console.error(`❌ [${fileId}] Upload failed after ${totalDuration}ms:`, {
            errorType: typeof error,
            errorMessage: error.message || 'Unknown error',
            folder,
            fileName: file.name,
            fileSize: file.size,
            userId
        })

        return {
            success: false,
            error: error.message || 'Upload failed due to unknown error'
        }
    }
}

// Download a file from Appwrite Storage
export async function downloadFile(fileId) {
    try {
        const { data, error } = await storage.getFileDownload(STORAGE_BUCKET_ID, fileId)

        if (error) {
            throw error
        }

        return data
    } catch (error) {
        console.error('Download error:', error)
        return null
    }
}

// Delete a file from Appwrite Storage
export async function deleteFile(fileId) {
    try {
        const { error } = await storage.deleteFile(STORAGE_BUCKET_ID, fileId)

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
export function getPublicUrl(fileId) {
    const { data } = storage.getFileView(STORAGE_BUCKET_ID, fileId)
    return data.href
}

// List files in a user's folder
export async function listUserFiles(folder, userId) {
    try {
        const { data, error } = await storage.listFiles(STORAGE_BUCKET_ID, [
            `folder=${folder}/${userId}`
        ])

        if (error) {
            throw error
        }

        return data.files.map(file => ({
            name: file.name,
            path: file.name,
            url: getPublicUrl(file.$id),
            size: file.sizeOriginal || 0,
            createdAt: file.$createdAt
        }))
    } catch (error) {
        console.error('List files error:', error)
        return []
    }
}

// Upload product image and save to database
export async function uploadProductImage(file, userId) {
    const startTime = Date.now()
    const operationId = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

    try {
        console.log(`💾 [${operationId}] Saving product image...`, { userId, fileName: file.name })

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

        // Validate file size
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
            throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max ${maxSize / 1024 / 1024}MB)`)
        }

        if (file.size < 1024) {
            throw new Error('File too small. Please use a larger image.')
        }

        // Upload to storage
        const uploadResult = await uploadFile('product-images', file, userId)

        if (!uploadResult.success || !uploadResult.data) {
            throw new Error(uploadResult.error || 'Upload failed')
        }

        console.log('📁 Storage upload successful:', uploadResult.data.url)

        // Save to database
        const { data, error } = await databases.createDocument(
            'modele-giydir-db',
            COLLECTIONS.productImages,
            'unique()',
            {
                user_id: userId,
                original_filename: file.name,
                image_url: uploadResult.data.url,
                image_path: uploadResult.data.id,
                file_size: file.size,
                mime_type: file.type,
                created_at: new Date().toISOString()
            }
        )

        if (error) {
            console.error('❌ Database save error:', error)
            // Clean up uploaded file if database save fails
            await deleteFile(uploadResult.data.id)
            throw error
        }

        console.log('✅ Database save successful:', data)

        return {
            success: true,
            data: {
                ...data,
                image_url: uploadResult.data.url
            }
        }
    } catch (error) {
        const totalDuration = Date.now() - startTime
        console.error(`❌ [${operationId}] Save product image error:`, {
            errorType: typeof error,
            errorMessage: error.message || 'Unknown error',
            userId,
            fileName: file.name,
            fileSize: file.size
        })

        return {
            success: false,
            error: error.message || 'Save failed due to unknown error'
        }
    }
}

// Get product image database ID by user and original filename
export async function getProductImageId(userId, originalFilename) {
    try {
        console.log('🔍 Looking up product image ID for:', { userId, originalFilename })

        const { data, error } = await databases.listDocuments(
            'modele-giydir-db',
            COLLECTIONS.productImages,
            [
                Query.equal('user_id', userId),
                Query.equal('original_filename', originalFilename),
                Query.orderDesc('created_at'),
                Query.limit(1)
            ]
        )

        if (error) {
            console.error('❌ Error fetching product image ID:', error)
            return null
        }

        return data.documents[0]?.id || null
    } catch (error) {
        console.error('❌ Error in getProductImageId:', error)
        return null
    }
}

// Get model photo database ID by local model ID
export async function getModelPhotoId(localModelId) {
    try {
        console.log('🔍 Looking up model photo ID for local model:', localModelId)

        const { data, error } = await databases.getDocument(
            'modele-giydir-db',
            COLLECTIONS.modelPhotos,
            localModelId
        )

        if (error) {
            console.error('❌ Error fetching model photo ID:', error)
            return null
        }

        return data?.id || null
    } catch (error) {
        console.error('❌ Error in getModelPhotoId:', error)
        return null
    }
}

// Save AI try-on result
export async function createTryOnResult(
    userId,
    productImageId,
    modelPhotoId
) {
    try {
        console.log('🚀 Creating try-on result record:', { userId, productImageId, modelPhotoId })

        const { data, error } = await databases.createDocument(
            'modele-giydir-db',
            COLLECTIONS.tryOnResults,
            'unique()',
            {
                user_id: userId,
                product_image_id: productImageId,
                model_photo_id: modelPhotoId,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        )

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
            error: error.message || 'Unknown error'
        }
    }
}

// Get try-on result status
export async function getTryOnResultStatus(jobId, userId) {
    try {
        console.log('🔍 Getting try-on result status:', { jobId, userId })

        const { data, error } = await databases.getDocument(
            'modele-giydir-db',
            COLLECTIONS.tryOnResults,
            jobId
        )

        if (error) {
            console.error('❌ Error getting try-on result status:', error)
            return {
                success: false,
                error: error.message
            }
        }

        // Ensure the result belongs to the user
        if (data.user_id !== userId) {
            return {
                success: false,
                error: 'Access denied'
            }
        }

        return {
            success: true,
            data: {
                status: data.status,
                result_image_url: data.result_image_url,
                error_message: data.error_message
            }
        }
    } catch (error) {
        console.error('❌ Error in getTryOnResultStatus:', error)
        return {
            success: false,
            error: error.message || 'Unknown error'
        }
    }
}

// Get user's product images
export async function getUserProductImages(userId) {
    try {
        const { data, error } = await databases.listDocuments(
            'modele-giydir-db',
            COLLECTIONS.productImages,
            [
                Query.equal('user_id', userId),
                Query.orderDesc('created_at')
            ]
        )

        if (error) {
            throw error
        }

        return data.documents
    } catch (error) {
        console.error('Get user product images error:', error)
        return []
    }
}

// Delete a product image from both storage and database
export async function deleteProductImage(imageId, userId) {
    try {
        console.log(`🗑️ Deleting product image: ${imageId} for user: ${userId}`)

        // First, get the image details to find the storage path
        const { data: imageData, error: fetchError } = await databases.getDocument(
            'modele-giydir-db',
            COLLECTIONS.productImages,
            imageId
        )

        if (fetchError) {
            console.error('❌ Error fetching image details:', fetchError)
            throw new Error(`Failed to fetch image details: ${fetchError.message}`)
        }

        if (!imageData || imageData.user_id !== userId) {
            throw new Error('Image not found or access denied')
        }

        console.log(`📁 Deleting from storage: ${imageData.image_path}`)

        // Delete from storage
        const { error: storageError } = await storage.deleteFile(STORAGE_BUCKET_ID, imageData.image_path)

        if (storageError) {
            console.error('❌ Error deleting from storage:', storageError)
            // Don't throw here - continue with database deletion even if storage fails
        }

        // Delete from database
        const { error: dbError } = await databases.deleteDocument(
            'modele-giydir-db',
            COLLECTIONS.productImages,
            imageId
        )

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
            error: error.message || 'Delete failed'
        }
    }
}

// Get user's try-on results
export async function getUserTryOnResults(userId) {
    try {
        const { data, error } = await databases.listDocuments(
            'modele-giydir-db',
            COLLECTIONS.tryOnResults,
            [
                Query.equal('user_id', userId),
                Query.orderDesc('created_at')
            ]
        )

        if (error) {
            throw error
        }

        return data.documents
    } catch (error) {
        console.error('Get user try-on results error:', error)
        return []
    }
}

// Get user's try-on results with detailed information for gallery
export async function getUserTryOnResultsForGallery(userId, limit = 50, offset = 0) {
    try {
        const { data, error } = await databases.listDocuments(
            'modele-giydir-db',
            COLLECTIONS.tryOnResults,
            [
                Query.equal('user_id', userId),
                Query.equal('status', 'completed'),
                Query.notEqual('result_image_url', null),
                Query.orderDesc('created_at'),
                Query.limit(limit),
                Query.offset(offset)
            ]
        )

        if (error) {
            throw error
        }

        // Get related product images and model photos
        const results = await Promise.all(data.documents.map(async (result) => {
            try {
                const [productImage, modelPhoto] = await Promise.all([
                    databases.getDocument('modele-giydir-db', COLLECTIONS.productImages, result.product_image_id),
                    databases.getDocument('modele-giydir-db', COLLECTIONS.modelPhotos, result.model_photo_id)
                ])

                return {
                    ...result,
                    product_images: productImage,
                    model_photos: modelPhoto
                }
            } catch (relatedError) {
                console.error('Error fetching related data:', relatedError)
                return result
            }
        }))

        return {
            success: true,
            data: results,
            count: results.length
        }
    } catch (error) {
        console.error('Get user try-on results for gallery error:', error)
        return {
            success: false,
            error: error.message || 'Unknown error',
            data: [],
            count: 0
        }
    }
}

// Get user's try-on results count for pagination
export async function getUserTryOnResultsCount(userId) {
    try {
        const { data, error } = await databases.listDocuments(
            'modele-giydir-db',
            COLLECTIONS.tryOnResults,
            [
                Query.equal('user_id', userId),
                Query.equal('status', 'completed'),
                Query.notEqual('result_image_url', null)
            ]
        )

        if (error) {
            throw error
        }

        return {
            success: true,
            count: data.total
        }
    } catch (error) {
        console.error('Get user try-on results count error:', error)
        return {
            success: false,
            error: error.message || 'Unknown error',
            count: 0
        }
    }
}

// Search user's try-on results
export async function searchUserTryOnResults(userId, searchTerm, limit = 50) {
    try {
        // First get all results for the user
        const { data, error } = await databases.listDocuments(
            'modele-giydir-db',
            COLLECTIONS.tryOnResults,
            [
                Query.equal('user_id', userId),
                Query.equal('status', 'completed'),
                Query.notEqual('result_image_url', null),
                Query.orderDesc('created_at'),
                Query.limit(100) // Get more to filter client-side
            ]
        )

        if (error) {
            throw error
        }

        // Get related data and filter
        const results = await Promise.all(data.documents.map(async (result) => {
            try {
                const [productImage, modelPhoto] = await Promise.all([
                    databases.getDocument('modele-giydir-db', COLLECTIONS.productImages, result.product_image_id),
                    databases.getDocument('modele-giydir-db', COLLECTIONS.modelPhotos, result.model_photo_id)
                ])

                return {
                    ...result,
                    product_images: productImage,
                    model_photos: modelPhoto
                }
            } catch (relatedError) {
                console.error('Error fetching related data:', relatedError)
                return result
            }
        }))

        // Filter results based on search term
        const filteredResults = results.filter(result => {
            const productName = result.product_images?.original_filename || ''
            const modelName = result.model_photos?.name || ''
            return productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   modelName.toLowerCase().includes(searchTerm.toLowerCase())
        })

        return {
            success: true,
            data: filteredResults.slice(0, limit)
        }
    } catch (error) {
        console.error('Search user try-on results error:', error)
        return {
            success: false,
            error: error.message || 'Unknown error',
            data: []
        }
    }
}

// Debug: List all product images for a user
export async function debugUserProductImages(userId) {
    console.log('🔍 DEBUG: Listing all product images for user:', userId)

    try {
        const { data, error } = await databases.listDocuments(
            'modele-giydir-db',
            COLLECTIONS.productImages,
            [
                Query.equal('user_id', userId),
                Query.orderDesc('created_at'),
                Query.limit(20)
            ]
        )

        console.log('🗄️ DEBUG: User product images:', { data, error })

        if (data) {
            console.log('📋 DEBUG: Available filenames:', data.documents.map(img => img.original_filename))
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
        // Test model_photos collection
        const modelPhotos = await databases.listDocuments(
            'modele-giydir-db',
            COLLECTIONS.modelPhotos,
            [Query.limit(5)]
        )

        console.log('📊 Model photos collection:', { data: modelPhotos.documents, total: modelPhotos.total })

        // Test product_images collection
        const productImages = await databases.listDocuments(
            'modele-giydir-db',
            COLLECTIONS.productImages,
            [Query.limit(5)]
        )

        console.log('📊 Product images collection:', { data: productImages.documents, total: productImages.total })

        // Test try_on_results collection
        const tryOnResults = await databases.listDocuments(
            'modele-giydir-db',
            COLLECTIONS.tryOnResults,
            [Query.limit(5)]
        )

        console.log('📊 Try-on results collection:', { data: tryOnResults.documents, total: tryOnResults.total })

        return {
            success: true,
            modelPhotos: modelPhotos.total || 0,
            productImages: productImages.total || 0,
            tryOnResults: tryOnResults.total || 0,
            errors: []
        }

    } catch (error) {
        console.error('❌ Database test failed:', error)
        return {
            success: false,
            error: error.message || 'Unknown error'
        }
    }
}
