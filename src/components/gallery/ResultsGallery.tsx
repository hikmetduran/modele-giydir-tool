'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, Download, Calendar, Clock, User, Check } from 'lucide-react'
import Image from 'next/image'
import { cn, formatDate, formatTime, groupByDate, sortDateGroups, downloadImage, downloadMultipleImages } from '@/lib/utils'
import { useAuth } from '@/components/auth/AuthProvider'
import { getUserTryOnResultsGroupedByDate, processRegenerateResult, getTryOnResultStatus } from '@/lib/supabase-storage'
import { processTryOnWithEdgeFunction, processVideoGenerationWithEdgeFunction, getVideoGenerationStatus } from '@/lib/edge-functions'
import { useWallet } from '@/lib/hooks/useWallet'
import RegenerateButton from '@/components/ui/RegenerateButton'
import GenerateVideoButton from '@/components/ui/GenerateVideoButton'
import VideoThumbnail from '@/components/ui/VideoThumbnail'

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
    // Video fields
    video_url?: string
    video_status?: string
    video_error_message?: string
    video_processing_started_at?: string
    video_processing_completed_at?: string
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

// Type for the raw database response (flexible to handle both array and object formats)
type DatabaseResponse = Record<string, unknown> & {
    id: string
    created_at: string
    updated_at: string
    status: string
    result_image_url: string
    ai_provider: string
    ai_model: string
    processing_time_seconds: number
    metadata: Record<string, unknown>
    video_url?: string
    video_status?: string
    video_error_message?: string
    video_processing_started_at?: string
    video_processing_completed_at?: string
    product_images: unknown
    model_photos: unknown
}

interface ResultsGalleryProps {
    className?: string
}

type SortBy = 'date' | 'model' | 'filename'
type SortOrder = 'asc' | 'desc'

export default function ResultsGallery({ className }: ResultsGalleryProps) {
    const { user } = useAuth()
    const { wallet, refreshWallet } = useWallet()
    const [results, setResults] = useState<TryOnResult[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set())
    const [sortBy] = useState<SortBy>('date')
    const [sortOrder] = useState<SortOrder>('desc')
    const [filterGender, setFilterGender] = useState<string>('all')
    const [showBulkActions, setShowBulkActions] = useState(false)
    const [regeneratingResults, setRegeneratingResults] = useState<Set<string>>(new Set())
    const [generatingVideos, setGeneratingVideos] = useState<Set<string>>(new Set())


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
                    console.log('🔍 Debug: Video fields:', {
                        video_url: response.data[0].video_url,
                        video_status: response.data[0].video_status,
                        video_error_message: response.data[0].video_error_message
                    })
                }
                // Check for results with videos
                const resultsWithVideos = response.data.filter((result: DatabaseResponse) => result.video_url)
                console.log('🎬 Debug: Results with videos:', resultsWithVideos.length, 'out of', response.data.length)
                if (resultsWithVideos.length > 0) {
                    console.log('🎬 Debug: First video result:', {
                        id: resultsWithVideos[0].id,
                        video_url: resultsWithVideos[0].video_url,
                        video_status: resultsWithVideos[0].video_status
                    })
                }
                // Transform database results to component format
                const transformedResults: TryOnResult[] = response.data
                    .filter((result: DatabaseResponse) =>
                        result.product_images && result.model_photos
                    )
                    .map((result: DatabaseResponse) => ({
                        ...result,
                        // Handle both array and object formats
                        product_images: Array.isArray(result.product_images) ? result.product_images[0] : result.product_images,
                        model_photos: Array.isArray(result.model_photos) ? result.model_photos[0] : result.model_photos
                    }))
                    .filter((result: DatabaseResponse) =>
                        result.product_images && result.model_photos
                    ) as TryOnResult[]
                setResults(transformedResults)
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
        return [...new Set(results.map(r => r.model_photos?.gender).filter(Boolean))]
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


    // Handle regeneration
    const handleRegenerate = async (resultId: string) => {
        if (!user || !wallet || wallet.credits < 5) {
            alert('Insufficient credits. You need 5 credits to regenerate a result.')
            return
        }

        try {
            setRegeneratingResults(prev => new Set([...prev, resultId]))

            // Step 1: Create regeneration record
            const regenerateResult = await processRegenerateResult(resultId, user.id)
            if (!regenerateResult.success || !regenerateResult.data) {
                throw new Error(regenerateResult.error || 'Failed to start regeneration')
            }

            const newJobId = regenerateResult.data.jobId

            // Step 2: Get original result details for processing
            const originalResult = results.find(r => r.id === resultId)
            if (!originalResult) {
                throw new Error('Original result not found')
            }

            // Step 3: Process with edge function
            const processResult = await processTryOnWithEdgeFunction(
                originalResult.product_images.id,
                originalResult.model_photos.id,
                newJobId,
                undefined, // category
                true // isRegeneration
            )

            if (!processResult.success) {
                throw new Error(processResult.error || 'Processing failed')
            }

            // Step 4: Poll for completion
            await pollForRegenerationCompletion(newJobId)

        } catch (error) {
            console.error('Regeneration failed:', error)
            alert(error instanceof Error ? error.message : 'Regeneration failed')
        } finally {
            setRegeneratingResults(prev => {
                const newSet = new Set(prev)
                newSet.delete(resultId)
                return newSet
            })
        }
    }

    // Poll for regeneration completion
    const pollForRegenerationCompletion = async (jobId: string) => {
        if (!user) return

        let attempts = 0
        const maxAttempts = 120 // 10 minutes max

        while (attempts < maxAttempts) {
            try {
                const statusResult = await getTryOnResultStatus(jobId, user.id)

                if (statusResult.success && statusResult.data) {
                    const { status, result_image_url } = statusResult.data

                    if (status === 'completed' && result_image_url) {
                        // Refresh the results to show the new regenerated result
                        await loadResults()
                        // Refresh the results to show the new regenerated result
                        await loadResults()
                        // Force wallet refresh and trigger global event for Header update
                        refreshWallet()
                        window.dispatchEvent(new CustomEvent('walletUpdated'))
                        
                        // Add a delayed refresh as backup
                        setTimeout(() => {
                            refreshWallet()
                            window.dispatchEvent(new CustomEvent('walletUpdated'))
                        }, 2000)
                        return
                    } else if (status === 'failed') {
                        throw new Error('Regeneration processing failed')
                    }
                }
            } catch (error) {
                console.error('Error polling for regeneration completion:', error)
                break
            }

            attempts++
            await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
        }

        throw new Error('Regeneration timed out')
    }

    // Video generation functions
    const handleGenerateVideo = async (resultId: string) => {
        if (!user || !wallet || wallet.credits < 50) {
            alert('Insufficient credits. You need 50 credits to generate a video.')
            return
        }

        try {
            setGeneratingVideos(prev => new Set([...prev, resultId]))

            const result = await processVideoGenerationWithEdgeFunction(resultId)

            if (result.success) {
                console.log('✅ Video generation started successfully')
                // Poll for video completion
                await pollForVideoCompletion(resultId)
            } else {
                console.error('❌ Video generation failed:', result.error)
                alert(result.error || 'Video generation failed')
            }
        } catch (error) {
            console.error('Video generation failed:', error)
            alert(error instanceof Error ? error.message : 'Video generation failed')
        } finally {
            setGeneratingVideos(prev => {
                const newSet = new Set(prev)
                newSet.delete(resultId)
                return newSet
            })
        }
    }

    // Poll for video generation completion
    const pollForVideoCompletion = async (resultId: string) => {
        if (!user) return

        let attempts = 0
        const maxAttempts = 240 // 20 minutes max (5 second intervals)

        while (attempts < maxAttempts) {
            try {
                const statusResult = await getVideoGenerationStatus(resultId, user.id)

                if (statusResult.success && statusResult.data) {
                    const { video_status, video_url, video_error_message } = statusResult.data

                    if (video_status === 'completed' && video_url) {
                        console.log('✅ Video generation completed successfully')
                        // Refresh the results to show the new video
                        await loadResults()
                        // Refresh wallet and trigger global event for Header update
                        refreshWallet()
                        window.dispatchEvent(new CustomEvent('walletUpdated'))
                        return
                    } else if (video_status === 'failed') {
                        console.error('❌ Video generation failed:', video_error_message)
                        alert(video_error_message as string || 'Video generation failed')
                        return
                    }
                }
            } catch (error) {
                console.error('❌ Error polling for video completion:', error)
            }

            attempts++
            await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
        }

        // Timeout
        console.error('❌ Video generation timed out')
        alert('Video generation timed out')
    }

    const downloadVideo = async (url: string, filename: string) => {
        try {
            // For external URLs, we need to fetch and create a blob
            const response = await fetch(url)
            const blob = await response.blob()

            // Create object URL from blob
            const objectUrl = URL.createObjectURL(blob)

            // Create download link
            const link = document.createElement('a')
            link.href = objectUrl
            link.download = filename
            document.body.appendChild(link)
            link.click()

            // Cleanup
            document.body.removeChild(link)
            URL.revokeObjectURL(objectUrl)
        } catch (error) {
            console.error('Video download failed:', error)
            // Fallback: open in new tab
            window.open(url, '_blank')
        }
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
                                        onToggleSelection={() => toggleSelection(result.id)}
                                        onRegenerate={handleRegenerate}
                                        isRegenerating={regeneratingResults.has(result.id)}
                                        canRegenerate={wallet ? wallet.credits >= 5 : false}
                                        onGenerateVideo={handleGenerateVideo}
                                        isGeneratingVideo={generatingVideos.has(result.id)}
                                        canGenerateVideo={wallet ? wallet.credits >= 50 : false}
                                        onDownloadVideo={downloadVideo}
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
    onToggleSelection: () => void
    onRegenerate: (resultId: string) => Promise<void>
    isRegenerating: boolean
    canRegenerate: boolean
    onGenerateVideo: (resultId: string) => Promise<void>
    isGeneratingVideo: boolean
    canGenerateVideo: boolean
    onDownloadVideo: (url: string, filename: string) => Promise<void>
}

function ResultCard({
    result,
    isSelected,
    onToggleSelection,
    onRegenerate,
    isRegenerating,
    canRegenerate,
    onGenerateVideo,
    isGeneratingVideo,
    canGenerateVideo,
    onDownloadVideo
}: ResultCardProps) {
    const downloadResult = () => {
        downloadImage(result.result_image_url, `tryon-${result.product_images.original_filename}-${result.model_photos.name}.png`)
    }

    // const downloadOriginal = () => {
    //     downloadImage(result.product_images.image_url, `original-${result.product_images.original_filename}`)
    // }

    const hasVideo = !!(result.video_url && result.video_status === 'completed')
    const isVideoProcessing = result.video_status === 'processing'

    return (
        <div className={cn(
            'bg-white rounded-lg border p-6 transition-all duration-200',
            isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
        )}>
            <div className="flex items-center space-x-6">
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

                {/* Images and Video */}
                <div className="flex items-center space-x-2">
                    <Image
                        src={result.product_images.image_url}
                        alt="Original"
                        width={80}
                        height={80}
                        className="w-24 h-32 rounded-lg object-cover"
                    />
                    <div className="text-gray-400 text-3xl">→</div>
                    <Image
                        src={result.result_image_url}
                        alt="Try-on result"
                        width={80}
                        height={80}
                        className="w-24 h-32 rounded-lg object-cover"
                    />
                    
                    {/* Video thumbnail */}
                    {hasVideo && (
                        <>
                            <div className="text-gray-400 text-3xl">→</div>
                            <div className="w-24 h-32">
                                <VideoThumbnail
                                    videoUrl={result.video_url!}
                                    className="w-24 h-32 rounded-lg"
                                    onDownload={() => onDownloadVideo(result.video_url!, `try-on-video-${result.id}.mp4`)}
                                    autoPlay={true}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Details */}
                <div className="flex-1">
                    <div className="flex flex-col space-y-2 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>{result.model_photos.name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatTime(result.created_at)}</span>
                        </div>
                        {/* Video status indicator */}
                        {isVideoProcessing && (
                            <div className="flex items-center space-x-1 text-blue-600">
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                                <span className="text-xs">Generating video...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                    <RegenerateButton
                        onRegenerate={() => onRegenerate(result.id)}
                        disabled={!canRegenerate}
                        loading={isRegenerating}
                        size="sm"
                        className="text-xs"
                    />
                    {!hasVideo && (
                        <GenerateVideoButton
                            onGenerateVideo={() => onGenerateVideo(result.id)}
                            disabled={!canGenerateVideo}
                            loading={isGeneratingVideo || isVideoProcessing}
                            hasVideo={hasVideo}
                            size="sm"
                            className="text-xs"
                        />
                    )}
                    <button
                        onClick={downloadResult}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                        title="Download image"
                    >
                        <Download className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
} 