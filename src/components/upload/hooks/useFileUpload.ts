'use client'

import { useCallback, useState } from 'react'
import { FileRejection } from 'react-dropzone'
import { generateId, formatBytes, compressImage } from '@/lib/utils'
import { uploadProductImage } from '@/lib/supabase-storage'
import { SelectableImage } from '@/lib/types'
import { useAuth } from '@/components/auth/AuthProvider'

const UPLOAD_TIMEOUT = 30000

export interface UploadingFile {
    id: string
    file: File
    preview: string
    progress: number
    status: 'uploading' | 'success' | 'error'
    error?: string
    stage?: string
}

interface UseFileUploadProps {
    maxFiles: number
    maxSize: number
    selectedImages: SelectableImage[]
    onUploadSuccess: (image: SelectableImage) => void
}

export function useFileUpload({
    maxFiles,
    maxSize,
    selectedImages,
    onUploadSuccess
}: UseFileUploadProps) {
    const { user } = useAuth()
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const uploadSingleFile = async (uploadingFile: UploadingFile) => {
        if (!user) {
            setError('User not authenticated.')
            return
        }

        try {
            const fileId = uploadingFile.id
            const startTime = Date.now()

            setUploadingFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, progress: 10, stage: 'Preparing upload...' } : f
            ))

            setUploadingFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, progress: 25, stage: 'Uploading to cloud storage...' } : f
            ))

            const uploadPromise = uploadProductImage(uploadingFile.file, user.id)
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

            await compressImage(uploadingFile.file)
            const uploadDuration = Date.now() - startTime

            setUploadingFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, progress: 100, stage: `Completed in ${uploadDuration}ms`, status: 'success' } : f
            ))

            const newSelectableImage: SelectableImage = {
                id: result.data.id,
                name: uploadingFile.file.name,
                url: result.data.image_url,
                preview: uploadingFile.preview,
                size: uploadingFile.file.size,
                type: uploadingFile.file.type,
                createdAt: new Date(),
                isSelected: true,
                isUploaded: true,
                storageId: result.data.id,
                supabasePath: result.data.image_path,
                file: uploadingFile.file
            }

            onUploadSuccess(newSelectableImage)

            setTimeout(() => {
                setUploadingFiles(prev => prev.filter(f => f.id !== fileId))
            }, 2000)

        } catch (uploadError) {
            const errorMessage = uploadError instanceof Error ? uploadError.message : 'Upload failed'
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

            for (const uploadingFile of newUploadingFiles) {
                await uploadSingleFile(uploadingFile)
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to process images'
            setError(`Upload failed: ${errorMessage}`)
        } finally {
            setIsProcessing(false)
        }
    }, [selectedImages, uploadingFiles, maxFiles, maxSize, user, onUploadSuccess]) // eslint-disable-line react-hooks/exhaustive-deps

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

    return {
        uploadingFiles,
        isProcessing,
        error,
        onDrop,
        retryFailedUpload,
        setError
    }
}