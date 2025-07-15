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

// Add new type for stored images from database
export interface StoredImage {
    id: string
    original_filename: string
    image_url: string
    image_path: string
    file_size: number
    mime_type: string
    created_at: string
    updated_at: string
    user_id: string
}

// Add new type for selectable images (can be either uploaded or stored)
export interface SelectableImage {
    id: string
    name: string
    url: string
    preview: string
    size: number
    type: string
    createdAt: Date
    isSelected: boolean
    isUploaded: boolean // true if just uploaded, false if from storage
    storageId?: string // database ID if from storage
    supabasePath?: string
    file?: File // Optional - only available for newly uploaded images
}

export interface ModelImage {
    id: string
    name: string
    url: string
    preview: string
    description?: string
}

export interface ProcessingJob {
    id: string
    productImage: SelectableImage
    modelImage: ModelImage
    status: 'pending' | 'processing' | 'completed' | 'failed'
    progress: number
    createdAt: Date
    completedAt?: Date
    resultUrl?: string
    error?: string
}

export interface ProcessingResult {
    id: string
    jobId: string
    originalProduct: UploadedImage
    selectedModel: ModelImage
    resultUrl: string
    createdAt: Date
    downloaded?: boolean
}

export interface AppState {
    currentStep: 'upload' | 'select' | 'process' | 'results'
    currentJob?: ProcessingJob
    currentJobs?: ProcessingJob[]
    uploadedImages: SelectableImage[]
    selectedModel?: ModelImage
    processingHistory: ProcessingJob[]
    results: ProcessingResult[]
}

export interface AIAPIResponse {
    id: string
    status: 'starting' | 'processing' | 'succeeded' | 'failed'
    output?: string[]
    error?: string
    progress?: number
} 