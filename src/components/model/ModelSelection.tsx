'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Check, Users, Search, Loader2, Shirt, Square, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModelImage, Gender } from '@/lib/types'
import { GarmentType } from '@/lib/database/types/model_photos'
import { getAllModelImages } from '@/lib/models'

interface ModelSelectionProps {
    onSelect: (model: ModelImage, garmentType?: GarmentType) => void
    selectedModel?: ModelImage
    className?: string
}

export default function ModelSelection({
    onSelect,
    selectedModel,
    className
}: ModelSelectionProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedGender, setSelectedGender] = useState<Gender | 'all'>('all')
    const [selectedGarmentType, setSelectedGarmentType] = useState<GarmentType>('tops')
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

    const filteredModels = models
        .filter(model => {
            if (selectedGender === 'all') return true
            return model.gender === selectedGender
        })
        .filter(model => {
            // Filter by garment type - model must support the selected garment type
            return model.garment_types && model.garment_types.includes(selectedGarmentType)
        })
        .filter(
            model =>
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
            <div className="mb-8">
                {/* <Users className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Select a Model</h2>
                <p className="text-gray-600 mb-6">
                    Choose from our collection of diverse models to see how your product looks
                </p> */}

                {/* First Row: Search Bar and Gender Filter */}
                <div className="flex justify-between items-center mb-4">
                    {/* Search Bar */}
                    <div className="relative w-full max-w-xs">
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

                    {/* Gender Filter */}
                    <div className="flex items-center space-x-2">
                        {(['all', 'female', 'male'] as const).map(gender => (
                            <button
                                key={gender}
                                onClick={() => setSelectedGender(gender)}
                                disabled={loading}
                                className={cn(
                                    'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                                    selectedGender === gender
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
                                    'disabled:opacity-50 disabled:cursor-not-allowed'
                                )}
                            >
                                {gender.charAt(0).toUpperCase() + gender.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Second Row: Garment Type Filter (Centered) */}
                <div className="flex items-center justify-center space-x-2">
                    {([
                        { type: 'tops' as GarmentType, icon: Shirt, label: 'Tops' },
                        { type: 'bottoms' as GarmentType, icon: Square, label: 'Bottoms' },
                        { type: 'one-pieces' as GarmentType, icon: User, label: 'One-pieces' }
                    ]).map(({ type, icon: Icon, label }) => (
                        <button
                            key={type}
                            onClick={() => setSelectedGarmentType(type)}
                            disabled={loading}
                            className={cn(
                                'flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                                selectedGarmentType === type
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
                                'disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            <span>{label}</span>
                        </button>
                    ))}
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
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                    {filteredModels.map((model) => (
                        <div
                            key={model.id}
                            onClick={() => onSelect(model, selectedGarmentType)}
                            className={cn(
                                'relative border-2 rounded-lg p-2 cursor-pointer transition-all hover:shadow-lg',
                                selectedModel?.id === model.id
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 hover:border-purple-300'
                            )}
                        >
                            {/* Selection Indicator */}
                            {selectedModel?.id === model.id && (
                                <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                    <Check className="h-3 w-3 text-white" />
                                </div>
                            )}

                            {/* Model Image */}
                            <div className="aspect-[3/4] bg-gray-200 rounded-lg overflow-hidden mb-2">
                                <Image
                                    src={model.image_url}
                                    alt={model.name}
                                    width={150}
                                    height={200}
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
