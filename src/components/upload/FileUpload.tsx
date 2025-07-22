'use client'

import { useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { AlertCircle, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SelectableImage, StoredImage } from '@/lib/types'
import { useAuth } from '@/components/auth/AuthProvider'
import { useFileUpload } from './hooks/useFileUpload'
import { useStoredImages } from './hooks/useStoredImages'
import { useImageSelection } from './hooks/useImageSelection'
import { AuthPrompt } from './ui/AuthPrompt'
import { UploadArea } from './ui/UploadArea'
import { UploadingFileList } from './ui/UploadingFileList'
import { ImageControls } from './ui/ImageControls'
import { StoredImageGallery } from './ui/StoredImageGallery'

interface FileUploadProps {
    onUpload: (images: SelectableImage[]) => void
    maxFiles?: number
    maxSize?: number
    className?: string
}

export default function FileUpload({
    onUpload,
    maxFiles = 50,
    maxSize = 10 * 1024 * 1024, // 10MB
    className
}: FileUploadProps) {
    const { user } = useAuth()
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [globalError, setGlobalError] = useState<string | null>(null)

    const {
        storedImages,
        isLoading: isLoadingStored,
        error: storedImagesError,
        searchTerm,
        setSearchTerm,
        deleteImage,
        addStoredImage,
        filteredStoredImages,
    } = useStoredImages()

    const {
        selectedImages,
        toggleImageSelection,
        addSelectedImage,
        removeSelectedImage,
    } = useImageSelection({
        storedImages,
        maxFiles,
        onSelectionChange: onUpload,
        onMaxFilesError: setGlobalError
    })

    const {
        uploadingFiles,
        isProcessing,
        error: uploadError,
        onDrop,
        retryFailedUpload,
    } = useFileUpload({
        maxFiles,
        maxSize,
        selectedImages,
        onUploadSuccess: (newImage) => {
            addSelectedImage(newImage)
            const newStoredImage: StoredImage = {
                id: newImage.storageId!,
                user_id: user!.id,
                original_filename: newImage.name,
                image_url: newImage.url,
                image_path: newImage.supabasePath!,
                file_size: newImage.size,
                mime_type: newImage.type,
                created_at: newImage.createdAt.toISOString()
            }
            addStoredImage(newStoredImage)
        }
    })

    useEffect(() => {
        if (uploadError) {
            setGlobalError(uploadError)
        } else if (storedImagesError) {
            setGlobalError(storedImagesError)
        } else {
            setGlobalError(null)
        }
    }, [uploadError, storedImagesError])

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
        noClick: true
    })

    const handleDeleteImage = async (imageId: string) => {
        const success = await deleteImage(imageId)
        if (success) {
            removeSelectedImage(imageId)
        }
    }


    if (!user) {
        return <AuthPrompt className={className} />
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
            {isDragActive && (
                <div className="absolute inset-0 bg-purple-50 bg-opacity-95 border-2 border-dashed border-purple-400 rounded-lg flex items-center justify-center z-50">
                    <div className="text-center">
                        <Upload className="mx-auto h-16 w-16 text-purple-500 mb-4" />
                        <h3 className="text-xl font-semibold text-purple-900 mb-2">Drop your images here</h3>
                        <p className="text-purple-700">Release to upload your images</p>
                    </div>
                </div>
            )}


            <UploadArea
                isProcessing={isProcessing}
                isMaxFilesReached={selectedImages.length >= maxFiles}
                maxSize={maxSize}
                maxFiles={maxFiles}
                storedImagesCount={storedImages.length}
                onFileSelect={(files) => onDrop(files, [])}
                getInputProps={getInputProps}
            />

            <ImageControls
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                filteredCount={filteredStoredImages.length}
                totalCount={storedImages.length}
                onFileSelect={(files) => onDrop(files, [])}
                isProcessing={isProcessing}
                isMaxFilesReached={selectedImages.length >= maxFiles}
                maxSize={maxSize}
                maxFiles={maxFiles}
            />

            <UploadingFileList
                uploadingFiles={uploadingFiles}
                onRetry={retryFailedUpload}
            />

            {globalError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-700 whitespace-pre-line">{globalError}</div>
                </div>
            )}

            <StoredImageGallery
                isLoading={isLoadingStored}
                images={filteredStoredImages}
                selectedImages={selectedImages}
                viewMode={viewMode}
                searchTerm={searchTerm}
                onSelectImage={toggleImageSelection}
                onDeleteImage={handleDeleteImage}
            />
        </div>
    )
}
