export interface TryOnResult {
    id: string
    created_at: string
    updated_at: string
    status: string
    result_image_url: string
    ai_provider: string
    ai_model: string
    processing_time_seconds: number
    metadata: Record<string, unknown>
    product_images: {
        id: string
        original_filename: string
        image_url: string
        file_size: number
        created_at: string
    }
    model_photos: {
        id: string
        name: string
        image_url: string
        description: string
        gender: string
        body_type: string
    }
}

export type SortBy = 'date' | 'model' | 'filename'
export type SortOrder = 'asc' | 'desc'

export interface ResultsGalleryProps {
    className?: string
}

export interface ResultCardProps {
    result: TryOnResult
    isSelected: boolean
    isFavorite: boolean
    onToggleSelection: () => void
    onToggleFavorite: () => void
}
