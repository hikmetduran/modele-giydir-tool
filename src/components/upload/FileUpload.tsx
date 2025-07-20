'use client'

import { useCallback, useState, useEffect } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import Image from 'next/image'
import {
    Upload,
    AlertCircle,
    CheckCircle,
    Trash2,
    Search,
    Grid,
    List,
    Loader2,
    ImageIcon,
    Camera,
    FolderOpen
} from 'lucide-react'
import { cn, formatBytes, compressImage } from '@/lib/utils'
import { SelectableImage, StoredImage } from '@/lib/types'
import { generateId } from '@/lib/utils'
import {
    uploadProductImage,
    testStorageConnection,
    testDatabaseConnection,
    getUserProductImages,
    deleteProductImage
} from '@/lib/supabase-storage'
import { useAuth } from '@/components/auth/AuthProvider'

interface FileUploadProps {
    onUpload: (images: SelectableImage[]) => void
    maxFiles?: number
    maxSize?: number
    className?: string
}

interface UploadingFile {
    id: string
    file: File
    preview: string
    progress: number
    status: 'uploading' | 'success' | 'error'
    error?: string
    stage?: string
}

// Upload timeout in milliseconds (30 seconds)
const UPLOAD_TIMEOUT = 30000

export default function FileUpload({
    onUpload,
    maxFiles = 50,
    maxSize = 10 * 1024 * 1024, // 10MB
    className
}: FileUploadProps) {
    const { user } = useAuth()
    const [selectedImages, setSelectedImages] = useState<SelectableImage[]>([])
    const [storedImages, setStoredImages] = useState<StoredImage[]>([])
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
    const [isLoadingStored, setIsLoadingStored] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    // Removed unused isDragOver state

    // Load stored images when user signs in
    useEffect(() => {
        if (user) {
            loadStoredImages()
            testConnections()
        }
    }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

    // Sync selected images with parent component
    useEffect(() => {
        onUpload(selectedImages)
    }, [selectedImages, onUpload])

    const testConnections = async () => {
        console.log('👤 User signed in, testing connections...')

        try {
            const [storageResult, dbResult] = await Promise.all([
                testStorageConnection(),
                testDatabaseConnection()
            ])

            console.log('🧪 Storage test result:', storageResult)
            console.log('🧪 Database test result:', dbResult)

            if (!storageResult.success) {
                setError(`Storage setup issue: ${storageResult.error}`)
            } else if (!dbResult.success) {
                setError(`Database setup issue: ${dbResult.error}`)
            }
        } catch (error) {
            console.error('❌ Connection test failed:', error)
            setError('Connection test failed')
        }
    }

    const loadStoredImages = async () => {
        if (!user) return

        setIsLoadingStored(true)
        try {
            const images = await getUserProductImages(user.id)
            setStoredImages(images)
        } catch (error) {
            console.error('❌ Failed to load stored images:', error)
            setError('Failed to load your previous uploads')
        } finally {
            setIsLoadingStored(false)
        }
    }

    const convertStoredToSelectable = (stored: StoredImage): SelectableImage => ({
        id: stored.id,
        name: stored.original_filename,
        url: stored.image_url,
        preview: stored.image_url,
        size: stored.file_size || 0,
        type: stored.mime_type || 'image/jpeg',
        createdAt: new Date(stored.created_at),
        isSelected: false,
        isUploaded: false,
        storageId: stored.id,
        supabasePath: stored.image_path
    })

    const toggleImageSelection = (imageId: string) => {
        const image = storedImages.find(img => img.id === imageId)
        if (!image) return

        const selectableImage = convertStoredToSelectable(image)

        setSelectedImages(prev => {
            const isCurrentlySelected = prev.some(img => img.id === imageId)

            if (isCurrentlySelected) {
                return prev.filter(img => img.id !== imageId)
            } else {
                if (prev.length >= maxFiles) {
                    setError(`Maximum ${maxFiles} images can be selected`)
                    return prev
                }
                return [...prev, { ...selectableImage, isSelected: true }]
            }
        })
    }

    const deleteStoredImage = async (imageId: string) => {
        if (!user) return

        try {
            const result = await deleteProductImage(imageId, user.id)
            if (result.success) {
                // Remove from stored images
                setStoredImages(prev => prev.filter(img => img.id !== imageId))
                // Remove from selected images if selected
                setSelectedImages(prev => prev.filter(img => img.id !== imageId))
            } else {
                setError(`Failed to delete image: ${result.error}`)
            }
        } catch (error) {
            console.error('❌ Delete error:', error)
            setError('Failed to delete image')
        }
    }

    const uploadSingleFile = async (uploadingFile: UploadingFile) => {
        try {
            const fileId = uploadingFile.id
            const startTime = Date.now()

            // Update progress stages
            setUploadingFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, progress: 10, stage: 'Preparing upload...' } : f
            ))

            setUploadingFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, progress: 25, stage: 'Uploading to cloud storage...' } : f
            ))

            const uploadPromise = uploadProductImage(uploadingFile.file, user!.id)
            const result = await Promise.race([
                uploadPromise,
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Upload timeout')), UPLOAD_TIMEOUT)
                )
            ])

            if (!result.success || !result.data) {
                throw new Error(result.error || 'Upload failed')
            }

            setUploadingFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, progress: 90, stage: 'Optimizing image...' } : f
            ))

            // Compress image for potential future use
            await compressImage(uploadingFile.file)
            const uploadDuration = Date.now() - startTime

            setUploadingFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, progress: 100, stage: `Completed in ${uploadDuration}ms`, status: 'success' } : f
            ))

            // Create selectable image from upload result
            const newSelectableImage: SelectableImage = {
                id: result.data.id,
                name: uploadingFile.file.name,
                url: result.data.image_url,
                preview: uploadingFile.preview,
                size: uploadingFile.file.size,
                type: uploadingFile.file.type,
                createdAt: new Date(),
                isSelected: true, // Auto-select new uploads
                isUploaded: true,
                storageId: result.data.id,
                supabasePath: result.data.image_path,
                file: uploadingFile.file // Include the File object for newly uploaded images
            }

            // Add to selected images
            setSelectedImages(prev => [...prev, newSelectableImage])

            // Add to stored images for future reference
            const newStoredImage: StoredImage = {
                id: result.data.id,
                user_id: user!.id,
                original_filename: uploadingFile.file.name,
                image_url: result.data.image_url,
                image_path: result.data.image_path,
                file_size: uploadingFile.file.size,
                mime_type: uploadingFile.file.type,
                created_at: new Date().toISOString()
            }

            setStoredImages(prev => [newStoredImage, ...prev])

            // Remove from uploading files after delay
            setTimeout(() => {
                setUploadingFiles(prev => prev.filter(f => f.id !== fileId))
            }, 2000)

            console.log(`✅ Upload successful for ${uploadingFile.file.name}`)

        } catch (uploadError) {
            const errorMessage = uploadError instanceof Error ? uploadError.message : 'Upload failed'
            console.error(`❌ Upload error for ${uploadingFile.file.name}:`, uploadError)

            setUploadingFiles(prev => prev.map(f =>
                f.id === uploadingFile.id
                    ? { ...f, status: 'error', error: errorMessage, stage: 'Upload failed' }
                    : f
            ))
        }
    }

    const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
        setError(null)

        if (!user) {
            setError('Please sign in to upload images')
            return
        }

        if (rejectedFiles.length > 0) {
            const errorMessages = rejectedFiles.map(rejected => {
                const errors = rejected.errors.map((error) => {
                    switch (error.code) {
                        case 'file-too-large':
                            return `File too large (max ${formatBytes(maxSize)})`
                        case 'file-invalid-type':
                            return 'Invalid file type'
                        case 'too-many-files':
                            return `Too many files (max ${maxFiles})`
                        default:
                            return error.message
                    }
                })
                return `${rejected.file.name}: ${errors.join(', ')}`
            })
            setError(errorMessages.join('\n'))
            return
        }

        if (selectedImages.length + uploadingFiles.length + acceptedFiles.length > maxFiles) {
            setError(`Maximum ${maxFiles} images can be selected`)
            return
        }

        setIsProcessing(true)

        try {
            const newUploadingFiles: UploadingFile[] = acceptedFiles.map(file => ({
                id: generateId(),
                file,
                preview: URL.createObjectURL(file),
                progress: 0,
                status: 'uploading',
                stage: 'Queued for upload'
            }))

            setUploadingFiles(prev => [...prev, ...newUploadingFiles])

            // Upload files sequentially
            for (const uploadingFile of newUploadingFiles) {
                await uploadSingleFile(uploadingFile)
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to process images'
            setError(`Upload failed: ${errorMessage}`)
        } finally {
            setIsProcessing(false)
        }
    }, [selectedImages, uploadingFiles, maxFiles, maxSize, user]) // eslint-disable-line react-hooks/exhaustive-deps

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/webp': ['.webp']
        },
        maxFiles,
        maxSize,
        disabled: isProcessing || selectedImages.length >= maxFiles || !user,
        noClick: true // We'll handle clicks manually
    })

    const clearAllSelected = () => {
        setSelectedImages([])
        setError(null)
    }

    const filteredStoredImages = storedImages.filter(image =>
        image.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const retryFailedUpload = (fileId: string) => {
        const failedFile = uploadingFiles.find(f => f.id === fileId && f.status === 'error')
        if (failedFile) {
            setUploadingFiles(prev => prev.map(f =>
                f.id === fileId
                    ? { ...f, status: 'uploading', progress: 0, error: undefined, stage: 'Retrying...' }
                    : f
            ))
            uploadSingleFile(failedFile)
        }
    }

    const handleUploadClick = () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = true
        input.accept = 'image/jpeg,image/png,image/webp'
        input.onchange = (e) => {
            const files = Array.from((e.target as HTMLInputElement).files || [])
            if (files.length > 0) {
                onDrop(files, [])
            }
        }
        input.click()
    }

    if (!user) {
        return (
            <div className={cn('w-full', className)}>
                <div className="text-center py-12">
                    <ImageIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Sign in to upload images</h3>
                    <p className="text-gray-500">Please sign in to access your images and upload new ones</p>
                </div>
            </div>
        )
    }

    return (
        <div
            {...getRootProps()}
            className={cn(
                'w-full space-y-6 relative',
                className,
                isDragActive && 'ring-2 ring-purple-500 ring-offset-2 rounded-lg'
            )}
        >
            {/* Drag Overlay */}
            {isDragActive && (
                <div className="absolute inset-0 bg-purple-50 bg-opacity-95 border-2 border-dashed border-purple-400 rounded-lg flex items-center justify-center z-50">
                    <div className="text-center">
                        <Upload className="mx-auto h-16 w-16 text-purple-500 mb-4" />
                        <h3 className="text-xl font-semibold text-purple-900 mb-2">Drop your images here</h3>
                        <p className="text-purple-700">Release to upload your images</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Your Images</h2>
                    <p className="text-gray-600">
                        {selectedImages.length} of {maxFiles} images selected
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    {selectedImages.length > 0 && (
                        <button
                            onClick={clearAllSelected}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                        >
                            Clear All ({selectedImages.length})
                        </button>
                    )}
                </div>
            </div>

            {/* Upload Area - Always Visible */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-dashed border-purple-200 rounded-xl p-6 transition-all duration-200 hover:border-purple-300 hover:bg-gradient-to-br hover:from-purple-100 hover:to-blue-100">
                <input {...getInputProps()} />

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <div className="text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start space-x-2 mb-2">
                            <Camera className="h-6 w-6 text-purple-600" />
                            <h3 className="text-lg font-semibold text-gray-900">Upload New Images</h3>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Drag & drop images anywhere or click to browse
                        </p>
                        <p className="text-sm text-gray-500">
                            PNG, JPG, WEBP • Max {formatBytes(maxSize)} • Up to {maxFiles} images
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleUploadClick}
                            disabled={isProcessing || selectedImages.length >= maxFiles}
                            className={cn(
                                'flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all',
                                isProcessing || selectedImages.length >= maxFiles
                                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl'
                            )}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <FolderOpen className="h-5 w-5" />
                                    <span>Browse Files</span>
                                </>
                            )}
                        </button>

                        {storedImages.length > 0 && (
                            <div className="px-4 py-3 bg-white rounded-lg border text-sm text-gray-600 text-center">
                                <span className="font-medium">{storedImages.length}</span> images stored
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search images..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500 text-gray-900"
                        />
                    </div>
                    <button
                        onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        {viewMode === 'grid' ? <List className="h-5 w-5" /> : <Grid className="h-5 w-5" />}
                    </button>
                </div>

                <div className="text-sm text-gray-500">
                    {filteredStoredImages.length} of {storedImages.length} images
                </div>
            </div>

            {/* Active Uploads */}
            {uploadingFiles.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                        <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                        <span>Uploading {uploadingFiles.length} file{uploadingFiles.length !== 1 ? 's' : ''}...</span>
                    </h3>

                    <div className="space-y-3">
                        {uploadingFiles.map((file) => (
                            <div key={file.id} className="flex items-center space-x-4 p-4 bg-white rounded-lg border shadow-sm">
                                <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                                    <Image
                                        src={file.preview}
                                        alt={file.file.name}
                                        width={48}
                                        height={48}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{file.file.name}</p>
                                    <p className="text-sm text-gray-500">{formatBytes(file.file.size)}</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    {file.status === 'uploading' && (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-16 bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${file.progress}%` }}
                                                />
                                            </div>
                                            <span className="text-sm text-gray-600 w-10 text-right">{file.progress}%</span>
                                        </div>
                                    )}
                                    {file.status === 'success' && (
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                    )}
                                    {file.status === 'error' && (
                                        <div className="flex items-center space-x-2">
                                            <AlertCircle className="h-5 w-5 text-red-500" />
                                            <button
                                                onClick={() => retryFailedUpload(file.id)}
                                                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-700 whitespace-pre-line">{error}</div>
                </div>
            )}

            {/* Images Grid */}
            <div className="space-y-4">
                {isLoadingStored ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                        <span className="ml-2 text-gray-600">Loading your images...</span>
                    </div>
                ) : filteredStoredImages.length === 0 ? (
                    <div className="text-center py-12">
                        <ImageIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No images found</h3>
                        <p className="text-gray-500">
                            {searchTerm ? 'Try adjusting your search term' : 'Upload some images to get started'}
                        </p>
                    </div>
                ) : (
                    <div className={cn(
                        viewMode === 'grid'
                            ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                            : 'space-y-2'
                    )}>
                        {filteredStoredImages.map((image) => {
                            const isSelected = selectedImages.some(selected => selected.id === image.id)

                            return viewMode === 'grid' ? (
                                <div key={image.id} className="relative group">
                                    <div
                                        className={cn(
                                            'aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer transition-all',
                                            isSelected
                                                ? 'ring-4 ring-purple-500 shadow-lg'
                                                : 'hover:ring-2 hover:ring-purple-300 hover:shadow-md'
                                        )}
                                        onClick={() => toggleImageSelection(image.id)}
                                    >
                                        <Image
                                            src={image.image_url}
                                            alt={image.original_filename}
                                            fill
                                            className="object-cover"
                                        />

                                        {/* Selection indicator */}
                                        {isSelected && (
                                            <div className="absolute top-2 left-2 p-1 bg-purple-600 text-white rounded-full shadow-lg">
                                                <CheckCircle className="h-4 w-4" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Delete button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            deleteStoredImage(image.id)
                                        }}
                                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>

                                    {/* Image info */}
                                    <div className="mt-2 text-sm">
                                        <p className="font-medium text-gray-900 truncate">{image.original_filename}</p>
                                        <p className="text-xs text-gray-500">{formatBytes(image.file_size || 0)}</p>
                                    </div>
                                </div>
                            ) : (
                                <div key={image.id} className="flex items-center space-x-4 p-4 bg-white rounded-lg border hover:bg-gray-50 transition-colors">
                                    <div
                                        className={cn(
                                            'flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden cursor-pointer transition-all',
                                            isSelected
                                                ? 'ring-3 ring-purple-500 shadow-md'
                                                : 'hover:ring-2 hover:ring-purple-300'
                                        )}
                                        onClick={() => toggleImageSelection(image.id)}
                                    >
                                        <Image
                                            src={image.image_url}
                                            alt={image.original_filename}
                                            fill
                                            className="object-cover"
                                        />
                                        {isSelected && (
                                            <div className="absolute top-0 right-0 p-1 bg-purple-600 text-white rounded-full transform translate-x-1 -translate-y-1">
                                                <CheckCircle className="h-3 w-3" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{image.original_filename}</p>
                                        <p className="text-sm text-gray-500">{formatBytes(image.file_size || 0)}</p>
                                        <p className="text-xs text-gray-400">
                                            {new Date(image.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => toggleImageSelection(image.id)}
                                            className={cn(
                                                'px-3 py-1 text-sm font-medium rounded-md transition-colors',
                                                isSelected
                                                    ? 'bg-purple-600 text-white shadow-md'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            )}
                                        >
                                            {isSelected ? 'Selected' : 'Select'}
                                        </button>
                                        <button
                                            onClick={() => deleteStoredImage(image.id)}
                                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

        </div>
    )
}
