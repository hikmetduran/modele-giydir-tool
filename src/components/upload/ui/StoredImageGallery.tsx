'use client'

import Image from 'next/image'
import { Loader2, ImageIcon, CheckCircle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StoredImage, SelectableImage } from '@/lib/types'

interface StoredImageGalleryProps {
    isLoading: boolean
    images: StoredImage[]
    selectedImages: SelectableImage[]
    searchTerm: string
    onSelectImage: (id: string) => void
    onDeleteImage: (id: string) => void
}

export function StoredImageGallery({
    isLoading,
    images,
    selectedImages,
    searchTerm,
    onSelectImage,
    onDeleteImage
}: StoredImageGalleryProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                <span className="ml-2 text-gray-600">Loading your images...</span>
            </div>
        )
    }

    if (images.length === 0) {
        return (
            <div className="text-center py-12">
                <ImageIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No images found</h3>
                <p className="text-gray-500">
                    {searchTerm ? 'Try adjusting your search term' : 'Upload some images to get started'}
                </p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {images.map((image) => {
                const isSelected = selectedImages.some(selected => selected.id === image.id)

                return (
                    <div key={image.id} className="relative group">
                        <div
                            className={cn(
                                'relative aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden cursor-pointer transition-all border border-gray-200',
                            isSelected
                                ? 'ring-4 ring-purple-500/80 shadow-lg'
                                : 'hover:ring-2 hover:ring-purple-500/40 hover:shadow-md'
                            )}
                            onClick={() => onSelectImage(image.id)}
                        >
                            <Image
                                src={image.image_url}
                                alt={image.original_filename}
                                fill
                                className="object-cover"
                            />

                            {isSelected && (
                                <div className="absolute top-2 left-2 p-1 bg-purple-600 text-white rounded-full shadow-lg">
                                    <CheckCircle className="h-4 w-4" />
                                </div>
                            )}
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onDeleteImage(image.id)
                            }}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}