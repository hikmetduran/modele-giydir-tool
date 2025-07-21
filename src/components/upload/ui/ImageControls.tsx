'use client'

import { Search, List, Grid } from 'lucide-react'

type ViewMode = 'grid' | 'list'

interface ImageControlsProps {
    searchTerm: string
    onSearchTermChange: (term: string) => void
    viewMode: ViewMode
    onViewModeChange: (mode: ViewMode) => void
    filteredCount: number
    totalCount: number
}

export function ImageControls({
    searchTerm,
    onSearchTermChange,
    viewMode,
    onViewModeChange,
    filteredCount,
    totalCount
}: ImageControlsProps) {
    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Search images..."
                        value={searchTerm}
                        onChange={(e) => onSearchTermChange(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500 text-gray-900"
                    />
                </div>
                <button
                    onClick={() => onViewModeChange(viewMode === 'grid' ? 'list' : 'grid')}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                >
                    {viewMode === 'grid' ? <List className="h-5 w-5" /> : <Grid className="h-5 w-5" />}
                </button>
            </div>

            <div className="text-sm text-gray-500">
                {filteredCount} of {totalCount} images
            </div>
        </div>
    )
}