'use client'

import { useState } from 'react'
import { Play, Loader2, Video } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GenerateVideoButtonProps {
    onGenerateVideo: () => Promise<void>
    disabled?: boolean
    loading?: boolean
    hasVideo?: boolean
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export default function GenerateVideoButton({
    onGenerateVideo,
    disabled = false,
    loading = false,
    hasVideo = false,
    size = 'md',
    className
}: GenerateVideoButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false)

    const handleClick = async () => {
        if (disabled || loading || isGenerating) return

        try {
            setIsGenerating(true)
            await onGenerateVideo()
        } catch (error) {
            console.error('Video generation failed:', error)
        } finally {
            setIsGenerating(false)
        }
    }

    const isLoading = loading || isGenerating

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base'
    }

    const iconSizes = {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5'
    }

    return (
        <button
            onClick={handleClick}
            disabled={disabled || isLoading}
            className={cn(
                'flex items-center space-x-2 rounded-lg font-medium transition-all duration-200',
                sizeClasses[size],
                hasVideo
                    ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200'
                    : disabled || isLoading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                    : 'bg-purple-600 text-white hover:bg-purple-700 border border-purple-600 hover:border-purple-700 shadow-sm hover:shadow-md',
                className
            )}
            title={
                hasVideo
                    ? 'Video already generated'
                    : disabled
                    ? 'Insufficient credits (50 credits required)'
                    : isLoading
                    ? 'Generating video...'
                    : 'Generate 5-second video (50 credits)'
            }
        >
            {isLoading ? (
                <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
            ) : hasVideo ? (
                <Video className={iconSizes[size]} />
            ) : (
                <Play className={iconSizes[size]} />
            )}
            
            <span>
                {isLoading
                    ? 'Generating...'
                    : hasVideo
                    ? 'Video Ready'
                    : 'Generate Video'
                }
            </span>
            
            {!hasVideo && !isLoading && (
                <span className={cn(
                    'font-semibold',
                    size === 'sm' ? 'text-xs' : size === 'md' ? 'text-xs' : 'text-sm',
                    disabled ? 'text-gray-400' : 'text-purple-200'
                )}>
                    (50)
                </span>
            )}
        </button>
    )
}