'use client'

import { Camera, FolderOpen, Loader2 } from 'lucide-react'
import { cn, formatBytes } from '@/lib/utils'

interface UploadAreaProps {
    isProcessing: boolean
    isMaxFilesReached: boolean
    maxSize: number
    maxFiles: number
    storedImagesCount: number
    onFileSelect: (files: File[]) => void
    getInputProps: <T extends object>(props?: T) => T
}

export function UploadArea({
    isProcessing,
    isMaxFilesReached,
    maxSize,
    maxFiles,
    storedImagesCount,
    onFileSelect,
    getInputProps
}: UploadAreaProps) {
    const handleUploadClick = () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = true
        input.accept = 'image/jpeg,image/png,image/webp'
        input.onchange = (e) => {
            const files = Array.from((e.target as HTMLInputElement).files || [])
            if (files.length > 0) {
                onFileSelect(files)
            }
        }
        input.click()
    }

    // Don't show upload area when user has images - it will be integrated into ImageControls
    if (storedImagesCount > 0) {
        return (
            <input {...getInputProps()} className="hidden" />
        )
    }

    // Show full version when user has no images
    return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-dashed border-purple-200 rounded-xl p-8 transition-all duration-200 hover:border-purple-300 hover:bg-gradient-to-br hover:from-purple-100 hover:to-blue-100">
            <input {...getInputProps()} />

            <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <Camera className="h-8 w-8 text-purple-600" />
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Your Images</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Drag & drop your images here or click the button below to browse your files
                </p>
                
                <button
                    onClick={handleUploadClick}
                    disabled={isProcessing || isMaxFilesReached}
                    className={cn(
                        'inline-flex items-center space-x-2 px-8 py-3 rounded-lg font-medium transition-all mb-4',
                        isProcessing || isMaxFilesReached
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
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
                            <span>Choose Files</span>
                        </>
                    )}
                </button>
                
                <div className="text-sm text-gray-500 space-y-1">
                    <p>Supports PNG, JPG, WEBP formats</p>
                    <p>Maximum file size: {formatBytes(maxSize)} • Up to {maxFiles} images</p>
                </div>
            </div>
        </div>
    )
}