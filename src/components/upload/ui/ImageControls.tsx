'use client'

import { Search, List, Grid, Images, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type ViewMode = 'grid' | 'list'

interface ImageControlsProps {
    searchTerm: string
    onSearchTermChange: (term: string) => void
    viewMode: ViewMode
    onViewModeChange: (mode: ViewMode) => void
    filteredCount: number
    totalCount: number
    // Upload functionality props
    onFileSelect?: (files: File[]) => void
    isProcessing?: boolean
    isMaxFilesReached?: boolean
    maxSize?: number
    maxFiles?: number
}

export function ImageControls({
    searchTerm,
    onSearchTermChange,
    viewMode,
    onViewModeChange,
    filteredCount,
    totalCount,
    onFileSelect,
    isProcessing = false,
    isMaxFilesReached = false,
    maxFiles = 50
}: ImageControlsProps) {
    const handleUploadClick = () => {
        if (onFileSelect) {
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
    }

    if (totalCount === 0) {
        return null
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4">
                <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center space-x-2 text-gray-700">
                        <Images className="h-5 w-5 text-purple-600" />
                        <span className="font-medium text-sm">Your Images</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {filteredCount} of {totalCount}
                        </span>
                    </div>
                    
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search images..."
                            value={searchTerm}
                            onChange={(e) => onSearchTermChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500 text-gray-900 text-sm transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    {/* Add Upload Button */}
                    {onFileSelect && (
                        <button
                            onClick={handleUploadClick}
                            disabled={isProcessing || isMaxFilesReached}
                            className={cn(
                                'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                                isProcessing || isMaxFilesReached
                                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm hover:shadow-md'
                            )}
                            title={`Add more images (${maxFiles - totalCount} remaining)`}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="hidden sm:inline">Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4" />
                                    <span className="hidden sm:inline">Add Images</span>
                                </>
                            )}
                        </button>
                    )}

                    {/* View Mode Toggle */}
                    <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 hidden lg:block">View:</span>
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => onViewModeChange('grid')}
                                className={cn(
                                    'p-2 rounded-md transition-all text-sm',
                                    viewMode === 'grid'
                                        ? 'bg-white text-purple-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                )}
                                title="Grid view"
                            >
                                <Grid className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => onViewModeChange('list')}
                                className={cn(
                                    'p-2 rounded-md transition-all text-sm',
                                    viewMode === 'list'
                                        ? 'bg-white text-purple-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                )}
                                title="List view"
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}