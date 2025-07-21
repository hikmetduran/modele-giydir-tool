'use client'

import { Camera, FolderOpen, Loader2 } from 'lucide-react'
import { cn, formatBytes } from '@/lib/utils'

interface UploadAreaProps {
    isProcessing: boolean
    isMaxFilesReached: boolean
    maxSize: number
    maxFiles: number
    storedImagesCount: number
    onBrowseClick: () => void
    getInputProps: <T extends object>(props?: T) => T
}

export function UploadArea({
    isProcessing,
    isMaxFilesReached,
    maxSize,
    maxFiles,
    storedImagesCount,
    onBrowseClick,
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
                onBrowseClick()
            }
        }
        input.click()
    }

    return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-dashed border-purple-200 rounded-xl p-6 transition-all duration-200 hover:border-purple-300 hover:bg-gradient-to-br hover:from-purple-100 hover:to-blue-100">
            <input {...getInputProps()} />

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <div className="text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start space-x-2 mb-2">
                        <Camera className="h-6 w-6 text-purple-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Upload New Images</h3>
                    </div>
                    <p className="text-gray-600 mb-4">
                        Drag & drop images anywhere or click to browse
                    </p>
                    <p className="text-sm text-gray-500">
                        PNG, JPG, WEBP • Max {formatBytes(maxSize)} • Up to {maxFiles} images
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={handleUploadClick}
                        disabled={isProcessing || isMaxFilesReached}
                        className={cn(
                            'flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all',
                            isProcessing || isMaxFilesReached
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl'
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
                                <span>Browse Files</span>
                            </>
                        )}
                    </button>

                    {storedImagesCount > 0 && (
                        <div className="px-4 py-3 bg-white rounded-lg border text-sm text-gray-600 text-center">
                            <span className="font-medium">{storedImagesCount}</span> images stored
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}