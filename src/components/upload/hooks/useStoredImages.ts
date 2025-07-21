'use client'

import { useState, useEffect, useCallback } from 'react'
import { StoredImage } from '@/lib/types'
import { getUserProductImages, deleteProductImage } from '@/lib/supabase-storage'
import { useAuth } from '@/components/auth/AuthProvider'

export function useStoredImages() {
    const { user } = useAuth()
    const [storedImages, setStoredImages] = useState<StoredImage[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    const loadStoredImages = useCallback(async () => {
        if (!user) return

        setIsLoading(true)
        setError(null)
        try {
            const images = await getUserProductImages(user.id)
            setStoredImages(images)
        } catch (err) {
            console.error('Failed to load stored images:', err)
            setError('Failed to load your previous uploads.')
        } finally {
            setIsLoading(false)
        }
    }, [user])

    useEffect(() => {
        loadStoredImages()
    }, [loadStoredImages])

    const deleteImage = async (imageId: string) => {
        if (!user) return

        try {
            const result = await deleteProductImage(imageId, user.id)
            if (result.success) {
                setStoredImages(prev => prev.filter(img => img.id !== imageId))
                return true
            } else {
                setError(`Failed to delete image: ${result.error}`)
                return false
            }
        } catch (err) {
            console.error('Delete error:', err)
            setError('Failed to delete image.')
            return false
        }
    }

    const addStoredImage = (image: StoredImage) => {
        setStoredImages(prev => [image, ...prev])
    }

    const filteredStoredImages = storedImages.filter(image =>
        image.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return {
        storedImages,
        isLoading,
        error,
        searchTerm,
        setSearchTerm,
        deleteImage,
        addStoredImage,
        filteredStoredImages,
        setStoredImages
    }
}