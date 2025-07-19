'use client'

import { Heart, Download, Check, User, Clock } from 'lucide-react'
import { cn, downloadImage } from '@/lib/utils'
import type { ResultCardProps } from '../types'

export function ResultCard({ result, isSelected, isFavorite, onToggleSelection, onToggleFavorite }: ResultCardProps) {
    const downloadResult = () => {
        downloadImage(result.result_image_url, `tryon-${result.product_images.original_filename}-${result.model_photos.name}.jpg`)
    }

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
                    <img
                        src={result.product_images.image_url}
                        alt="Original"
                        className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="text-gray-400 text-2xl">→</div>
                    <img
                        src={result.result_image_url}
                        alt="Try-on result"
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
                            <span>{new Date(result.created_at).toLocaleTimeString()}</span>
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
