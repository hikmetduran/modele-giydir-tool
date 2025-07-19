/**
 * @deprecated This file is deprecated. Use @/lib/database/types instead.
 * This file provides backward compatibility for old type names.
 */

import type { ModelPhoto } from './database/types'
export type { ModelPhoto as ModelImage } from './database/types'
export type { ProductImage as StoredImage } from './database/types'
export type { TryOnResult as ProcessingResult } from './database/types'
export type { Gender } from './database/types'

// Internal type alias for use within this file
type ModelImage = ModelPhoto

// Legacy interfaces for backward compatibility
export interface UploadedImage {
    id: string
    file: File
    preview: string
    compressed?: File
    name: string
    size: number
    type: string
    uploadedAt: Date
    supabaseUrl?: string
    supabasePath?: string
}

export interface SelectableImage {
    id: string
    name: string
    url: string
    preview: string
    size: number
    type: string
    createdAt: Date
    isSelected: boolean
    isUploaded: boolean
    storageId?: string
    supabasePath?: string
    file?: File
}

export interface ProcessingJob {
    id: string
    productImage: SelectableImage
    modelImage: ModelImage // Model image uses ModelImage type (ModelPhoto from database)
    status: 'pending' | 'processing' | 'completed' | 'failed'
    progress: number
    createdAt: Date
    completedAt?: Date
    resultUrl?: string
    error?: string
}

export interface AppState {
    currentStep: 'upload' | 'select' | 'process' | 'results'
    currentJob?: ProcessingJob
    currentJobs?: ProcessingJob[]
    uploadedImages: SelectableImage[]
    selectedModel?: ModelImage // Model selection uses ModelImage type (ModelPhoto from database)
    processingHistory: ProcessingJob[]
    results: unknown[] // Using unknown for backward compatibility
}

export interface AIAPIResponse {
    id: string
    status: 'starting' | 'processing' | 'succeeded' | 'failed'
    output?: string[]
    error?: string
    progress?: number
}
