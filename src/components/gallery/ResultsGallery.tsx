'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, Download, Heart, Calendar, Clock, User, Check } from 'lucide-react'
import Image from 'next/image'
import { cn, formatDate, formatTime, groupByDate, sortDateGroups, downloadImage, downloadMultipleImages } from '@/lib/utils'
import { useAuth } from '@/components/auth/AuthProvider'
import { getUserTryOnResultsGroupedByDate } from '@/lib/supabase-storage'

interface TryOnResult {
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

interface ResultsGalleryProps {
    className?: string
}

type SortBy = 'date' | 'model' | 'filename'
type SortOrder = 'asc' | 'desc'

export default function ResultsGallery({ className }: ResultsGalleryProps) {
    const { user } = useAuth()
    const [results, setResults] = useState<TryOnResult[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set())
    const [sortBy] = useState<SortBy>('date')
    const [sortOrder] = useState<SortOrder>('desc')
    const [filterGender, setFilterGender] = useState<string>('all')
    const [favorites, setFavorites] = useState<Set<string>>(new Set())
    const [showBulkActions, setShowBulkActions] = useState(false)

    // Load favorites from localStorage
    const loadFavorites = () => {
        try {
            const stored = localStorage.getItem('tryon-favorites')
            if (stored) {
                setFavorites(new Set(JSON.parse(stored)))
            }
        } catch (error) {
            console.error('Failed to load favorites:', error)
        }
    }

    // Save favorites to localStorage
    const saveFavorites = (newFavorites: Set<string>) => {
        try {
            localStorage.setItem('tryon-favorites', JSON.stringify([...newFavorites]))
        } catch (error) {
            console.error('Failed to save favorites:', error)
        }
    }

    const loadResults = useCallback(async () => {
        if (!user) return

        setLoading(true)
        setError(null)

        try {
            const response = await getUserTryOnResultsGroupedByDate(user.id)
            if (response.success) {
                console.log('🔍 Debug: Results data structure:', response.data)
                if (response.data.length > 0) {
                    console.log('🔍 Debug: First result:', response.data[0])
                    console.log('🔍 Debug: Product images:', response.data[0].product_images)
                    console.log('🔍 Debug: Model photos:', response.data[0].model_photos)
                }
                setResults(response.data as TryOnResult[])
            } else {
                setError(response.error || 'Failed to load results')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }, [user])

    // Load data on mount
    useEffect(() => {
        loadResults()
        loadFavorites()
    }, [user, loadResults])

    // Filter and sort results
    const filteredAndSortedResults = useMemo(() => {
        let filtered = results

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(result =>
                result.product_images.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                result.model_photos.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        // Apply gender filter
        if (filterGender !== 'all') {
            filtered = filtered.filter(result => result.model_photos.gender === filterGender)
        }

        // Sort results
        filtered.sort((a, b) => {
            let comparison = 0

            switch (sortBy) {
                case 'date':
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    break
                case 'model':
                    comparison = a.model_photos.name.localeCompare(b.model_photos.name)
                    break
                case 'filename':
                    comparison = a.product_images.original_filename.localeCompare(b.product_images.original_filename)
                    break
            }

            return sortOrder === 'asc' ? comparison : -comparison
        })

        return filtered
    }, [results, searchTerm, filterGender, sortBy, sortOrder])

    // Group results by date
    const groupedResults = useMemo(() => {
        return groupByDate(filteredAndSortedResults)
    }, [filteredAndSortedResults])

    // Get sorted date groups
    const sortedDateGroups = useMemo(() => {
        return sortDateGroups(groupedResults)
    }, [groupedResults])

    // Get unique values for filters
    const uniqueGenders = useMemo(() => {
        return [...new Set(results.map(r => r.model_photos.gender))].filter(Boolean)
    }, [results])

    // Handle selection
    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedResults)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedResults(newSelected)
        setShowBulkActions(newSelected.size > 0)
    }

    const selectAll = () => {
        setSelectedResults(new Set(filteredAndSortedResults.map(r => r.id)))
        setShowBulkActions(true)
    }

    const deselectAll = () => {
        setSelectedResults(new Set())
        setShowBulkActions(false)
    }

    // Handle favorites
    const toggleFavorite = (id: string) => {
        const newFavorites = new Set(favorites)
        if (newFavorites.has(id)) {
            newFavorites.delete(id)
        } else {
            newFavorites.add(id)
        }
        setFavorites(newFavorites)
        saveFavorites(newFavorites)
    }

    // Handle bulk actions
    const downloadSelected = async () => {
        const selectedItems = filteredAndSortedResults.filter(r => selectedResults.has(r.id))
        const downloadItems = selectedItems.map(r => ({
            url: r.result_image_url,
            filename: `tryon-${r.product_images.original_filename}-${r.model_photos.name}.png`
        }))

        await downloadMultipleImages(downloadItems)
        deselectAll()
    }

    const downloadOriginalSelected = async () => {
        const selectedItems = filteredAndSortedResults.filter(r => selectedResults.has(r.id))
        const downloadItems = selectedItems.map(r => ({
            url: r.product_images.image_url,
            filename: `original-${r.product_images.original_filename}`
        }))

        await downloadMultipleImages(downloadItems)
        deselectAll()
    }

    const favoriteSelected = () => {
        const newFavorites = new Set(favorites)
        selectedResults.forEach(id => newFavorites.add(id))
        setFavorites(newFavorites)
        saveFavorites(newFavorites)
        deselectAll()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="text-red-500 mb-2">Error loading results</div>
                <div className="text-gray-600 mb-4">{error}</div>
                <button
                    onClick={loadResults}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                    Try Again
                </button>
            </div>
        )
    }

    if (results.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-gray-500 mb-2">No results found</div>
                <div className="text-gray-400">Start creating some try-on images to see them here!</div>
            </div>
        )
    }

    return (
        <div className={cn('max-w-7xl mx-auto', className)}>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Results Gallery</h1>
                <p className="text-gray-600 mt-2">
                    {results.length} result{results.length !== 1 ? 's' : ''} in total
                </p>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by product name or model..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-400 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Gender Filter Chips */}
            <div className="mb-4">
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Model Gender:</span>
                    <button
                        onClick={() => setFilterGender('all')}
                        className={cn(
                            'px-3 py-1 text-sm rounded-full transition-colors',
                            filterGender === 'all'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        )}
                    >
                        All
                    </button>
                    {uniqueGenders.map(gender => (
                        <button
                            key={gender}
                            onClick={() => setFilterGender(gender)}
                            className={cn(
                                'px-3 py-1 text-sm rounded-full transition-colors',
                                filterGender === gender
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            )}
                        >
                            {gender.charAt(0).toUpperCase() + gender.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bulk Actions */}
            {showBulkActions && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-purple-700">
                                {selectedResults.size} item{selectedResults.size !== 1 ? 's' : ''} selected
                            </span>
                            <button
                                onClick={selectAll}
                                className="text-sm text-purple-600 hover:text-purple-700"
                            >
                                Select All
                            </button>
                            <button
                                onClick={deselectAll}
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
                                onClick={favoriteSelected}
                                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                <Heart className="h-4 w-4" />
                                <span>Favorite</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Results */}
            {filteredAndSortedResults.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-gray-500 mb-2">No results match your filters</div>
                    <div className="text-gray-400">Try adjusting your search or filters</div>
                </div>
            ) : (
                <div className="space-y-8">
                    {sortedDateGroups.map(([dateKey, dateResults]) => (
                        <div key={dateKey} className="space-y-4">
                            {/* Date Header */}
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <Calendar className="h-5 w-5 text-gray-400" />
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        {formatDate(dateKey)}
                                    </h2>
                                </div>
                                <div className="flex-1 h-px bg-gray-200"></div>
                                <span className="text-sm text-gray-500">
                                    {dateResults.length} result{dateResults.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {/* Results List */}
                            <div className="space-y-4">
                                {dateResults.map((result) => (
                                    <ResultCard
                                        key={result.id}
                                        result={result}
                                        isSelected={selectedResults.has(result.id)}
                                        isFavorite={favorites.has(result.id)}
                                        onToggleSelection={() => toggleSelection(result.id)}
                                        onToggleFavorite={() => toggleFavorite(result.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

interface ResultCardProps {
    result: TryOnResult
    isSelected: boolean
    isFavorite: boolean
    onToggleSelection: () => void
    onToggleFavorite: () => void
}

function ResultCard({ result, isSelected, isFavorite, onToggleSelection, onToggleFavorite }: ResultCardProps) {
    const downloadResult = () => {
        downloadImage(result.result_image_url, `tryon-${result.product_images.original_filename}-${result.model_photos.name}.png`)
    }

    // const downloadOriginal = () => {
    //     downloadImage(result.product_images.image_url, `original-${result.product_images.original_filename}`)
    // }

    return (
        <div className={cn(
            'bg-white rounded-lg border p-4 transition-all duration-200',
            isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
        )}>
            <div className="flex items-center space-x-4">
                {/* Selection Checkbox */}
                <button
                    onClick={onToggleSelection}
                    className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                        isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300 hover:border-gray-400'
                    )}
                >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                </button>

                {/* Images */}
                <div className="flex items-center space-x-3">
                    <Image
                        src={result.product_images.image_url}
                        alt="Original"
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="text-gray-400 text-2xl">→</div>
                    <Image
                        src={result.result_image_url}
                        alt="Try-on result"
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-lg object-cover"
                    />
                </div>

                {/* Details */}
                <div className="flex-1">
                    <div className="flex flex-col space-y-1 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>{result.model_photos.name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatTime(result.created_at)}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={onToggleFavorite}
                        className={cn(
                            'p-2 rounded-lg transition-colors',
                            isFavorite ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-gray-600'
                        )}
                    >
                        <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
                    </button>
                    <button
                        onClick={downloadResult}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                    >
                        <Download className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
} 