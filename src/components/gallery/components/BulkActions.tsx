'use client'

import { Download, Heart } from 'lucide-react'
import { downloadMultipleImages } from '@/lib/utils'

interface BulkActionsProps {
    selectedResults: Set<string>
    filteredResults: any[]
    onDeselectAll: () => void
    onFavoriteSelected: () => void
}

export function BulkActions({ selectedResults, filteredResults, onDeselectAll, onFavoriteSelected }: BulkActionsProps) {
    const downloadSelected = async () => {
        const selectedItems = filteredResults.filter(r => selectedResults.has(r.id))
        const downloadItems = selectedItems.map(r => ({
            url: r.result_image_url,
            filename: `tryon-${r.product_images.original_filename}-${r.model_photos.name}.jpg`
        }))

        await downloadMultipleImages(downloadItems)
        onDeselectAll()
    }

    const downloadOriginalSelected = async () => {
        const selectedItems = filteredResults.filter(r => selectedResults.has(r.id))
        const downloadItems = selectedItems.map(r => ({
            url: r.product_images.image_url,
            filename: `original-${r.product_images.original_filename}`
        }))

        await downloadMultipleImages(downloadItems)
        onDeselectAll()
    }

    return (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <span className="text-sm text-purple-700">
                        {selectedResults.size} item{selectedResults.size !== 1 ? 's' : ''} selected
                    </span>
                    <button
                        onClick={() => {
                            const selectedItems = filteredResults.filter(r => selectedResults.has(r.id))
                            const allItems = filteredResults
                            if (selectedItems.length === allItems.length) {
                                onDeselectAll()
                            } else {
                                const allIds = new Set(allItems.map(r => r.id))
                                selectedResults.forEach(id => allIds.add(id))
                                const newSelected = new Set(allItems.map(r => r.id))
                                selectedResults.forEach(id => newSelected.add(id))
                            }
                        }}
                        className="text-sm text-purple-600 hover:text-purple-700"
                    >
                        {selectedResults.size === filteredResults.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                        onClick={onDeselectAll}
                        className="text-sm text-purple-600 hover:text-purple-700"
                    >
                        Deselect All
                    </button>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={downloadSelected}
                        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        <span>Download Results</span>
                    </button>
                    <button
                        onClick={downloadOriginalSelected}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        <span>Download Originals</span>
                    </button>
                    <button
                        onClick={onFavoriteSelected}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <Heart className="h-4 w-4" />
                        <span>Favorite</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
