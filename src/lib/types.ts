/**
 * @deprecated This file is deprecated. Use @/lib/database/types instead.
 * This file provides backward compatibility for old type names.
 */

export type { ModelPhoto as ModelImage } from './database/types'
export type { ProductImage as StoredImage } from './database/types'
export type { TryOnResult as ProcessingResult } from './database/types'
export type { Gender } from './database/types'

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
    modelImage: any // Using any for backward compatibility
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
    selectedModel?: any // Using any for backward compatibility
    processingHistory: ProcessingJob[]
    results: any[] // Using any for backward compatibility
}

export interface AIAPIResponse {
    id: string
    status: 'starting' | 'processing' | 'succeeded' | 'failed'
    output?: string[]
    error?: string
    progress?: number
}
