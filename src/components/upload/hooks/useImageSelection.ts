'use client'

import { useState, useEffect, useCallback } from 'react'
import { SelectableImage, StoredImage } from '@/lib/types'

interface UseImageSelectionProps {
    storedImages: StoredImage[]
    maxFiles: number
    onSelectionChange: (images: SelectableImage[]) => void
    onMaxFilesError: (message: string) => void
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

export function useImageSelection({
    storedImages,
    maxFiles,
    onSelectionChange,
    onMaxFilesError
}: UseImageSelectionProps) {
    const [selectedImages, setSelectedImages] = useState<SelectableImage[]>([])

    useEffect(() => {
        onSelectionChange(selectedImages)
    }, [selectedImages, onSelectionChange])

    const toggleImageSelection = useCallback((imageId: string) => {
        const image = storedImages.find(img => img.id === imageId)
        if (!image) return

        const selectableImage = convertStoredToSelectable(image)

        setSelectedImages(prev => {
            const isCurrentlySelected = prev.some(img => img.id === imageId)

            if (isCurrentlySelected) {
                return prev.filter(img => img.id !== imageId)
            } else {
                if (prev.length >= maxFiles) {
                    onMaxFilesError(`Maximum ${maxFiles} images can be selected`)
                    return prev
                }
                return [...prev, { ...selectableImage, isSelected: true }]
            }
        })
    }, [storedImages, maxFiles, onMaxFilesError])

    const addSelectedImage = (image: SelectableImage) => {
        setSelectedImages(prev => [...prev, image])
    }

    const removeSelectedImage = (imageId: string) => {
        setSelectedImages(prev => prev.filter(img => img.id !== imageId))
    }

    const clearAllSelected = () => {
        setSelectedImages([])
    }

    return {
        selectedImages,
        toggleImageSelection,
        addSelectedImage,
        removeSelectedImage,
        clearAllSelected
    }
}