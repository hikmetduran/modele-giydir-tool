'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Check, Users, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModelImage } from '@/lib/types'
import { getAllModelImages } from '@/lib/models'

interface ModelSelectionProps {
    onSelect: (model: ModelImage) => void
    selectedModel?: ModelImage
    className?: string
}

export default function ModelSelection({
    onSelect,
    selectedModel,
    className
}: ModelSelectionProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [models, setModels] = useState<ModelImage[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch models from database on component mount
    useEffect(() => {
        async function fetchModels() {
            try {
                setLoading(true)
                setError(null)
                const fetchedModels = await getAllModelImages()
                setModels(fetchedModels)
            } catch (err) {
                console.error('Error fetching models:', err)
                setError('Failed to load models. Please try again.')
            } finally {
                setLoading(false)
            }
        }

        fetchModels()
    }, [])

    const filteredModels = models.filter(model =>
        model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (model.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    )

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        // Set a fallback image or hide the image
        e.currentTarget.style.display = 'none'
    }

    const handleRetry = () => {
        // Retry fetching models
        setError(null)
        setLoading(true)
        getAllModelImages()
            .then(setModels)
            .catch(() => setError('Failed to load models. Please try again.'))
            .finally(() => setLoading(false))
    }

    return (
        <div className={cn('w-full', className)}>
            <div className="text-center mb-8">
                <Users className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Select a Model</h2>
                <p className="text-gray-600 mb-6">
                    Choose from our collection of diverse models to see how your product looks
                </p>

                {/* Search Bar */}
                <div className="relative max-w-md mx-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search models..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        disabled={loading}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-500 text-gray-900"
                    />
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-12 w-12 text-purple-500 animate-spin mb-4" />
                    <p className="text-gray-600">Loading models...</p>
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div className="text-center py-12">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
                        <p className="text-red-600 mb-4">{error}</p>
                        <button
                            onClick={handleRetry}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            {/* Model Grid */}
            {!loading && !error && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredModels.map((model) => (
                        <div
                            key={model.id}
                            onClick={() => onSelect(model)}
                            className={cn(
                                'relative border-2 rounded-lg p-3 cursor-pointer transition-all hover:shadow-lg',
                                selectedModel?.id === model.id
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 hover:border-purple-300'
                            )}
                        >
                            {/* Selection Indicator */}
                            {selectedModel?.id === model.id && (
                                <div className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                    <Check className="h-4 w-4 text-white" />
                                </div>
                            )}

                            {/* Model Image */}
                            <div className="aspect-[3/4] bg-gray-200 rounded-lg overflow-hidden mb-3">
                                <Image
                                    src={model.image_url}
                                    alt={model.name}
                                    width={300}
                                    height={400}
                                    className="w-full h-full object-cover"
                                    onError={handleImageError}
                                />
                            </div>

                            {/* Model Info */}
                            <div className="text-center">
                                <h3 className="font-medium text-gray-900 text-sm mb-1 truncate">
                                    {model.name}
                                </h3>
                                {model.description && (
                                    <p className="text-xs text-gray-500 line-clamp-2">
                                        {model.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* No Results */}
            {!loading && !error && filteredModels.length === 0 && models.length > 0 && (
                <div className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600">No models found matching your search.</p>
                    <button
                        onClick={() => setSearchTerm('')}
                        className="mt-2 text-purple-600 hover:text-purple-700 text-sm"
                    >
                        Clear search
                    </button>
                </div>
            )}

            {/* No Models Available */}
            {!loading && !error && models.length === 0 && (
                <div className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600">No models available at the moment.</p>
                    <button
                        onClick={handleRetry}
                        className="mt-2 text-purple-600 hover:text-purple-700 text-sm"
                    >
                        Refresh
                    </button>
                </div>
            )}

            {/* Selected Model Summary */}
            {selectedModel && !loading && (
                <div className="mt-8 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                                src={selectedModel.image_url}
                                alt={selectedModel.name}
                                width={64}
                                height={80}
                                className="w-full h-full object-cover"
                                onError={handleImageError}
                            />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium text-gray-900 mb-1">
                                Selected Model: {selectedModel.name}
                            </h3>
                            {selectedModel.description && (
                                <p className="text-sm text-gray-600">
                                    {selectedModel.description}
                                </p>
                            )}
                        </div>
                        <Check className="h-6 w-6 text-purple-600" />
                    </div>
                </div>
            )}
        </div>
    )
}
