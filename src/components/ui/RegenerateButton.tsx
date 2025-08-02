'use client'

import { useState } from 'react'
import { RotateCcw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RegenerateButtonProps {
    onRegenerate: () => Promise<void>
    disabled?: boolean
    loading?: boolean
    className?: string
    showCost?: boolean
    size?: 'sm' | 'md' | 'lg'
}

export default function RegenerateButton({
    onRegenerate,
    disabled = false,
    loading = false,
    className,
    showCost = true,
    size = 'md'
}: RegenerateButtonProps) {
    const [isRegenerating, setIsRegenerating] = useState(false)

    const handleRegenerate = async () => {
        if (disabled || isRegenerating || loading) return

        try {
            setIsRegenerating(true)
            await onRegenerate()
        } catch (error) {
            console.error('Regeneration failed:', error)
        } finally {
            setIsRegenerating(false)
        }
    }

    const isLoading = loading || isRegenerating

    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-3 text-base'
    }

    const iconSizes = {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5'
    }

    return (
        <button
            onClick={handleRegenerate}
            disabled={disabled || isLoading}
            className={cn(
                'inline-flex items-center space-x-2 rounded-lg font-medium transition-all duration-200',
                'bg-gradient-to-r from-purple-500 to-purple-600 text-white',
                'hover:from-purple-600 hover:to-purple-700 hover:shadow-md',
                'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none',
                sizeClasses[size],
                className
            )}
            title={showCost ? 'Regenerate result (5 credits)' : 'Regenerate result'}
        >
            {isLoading ? (
                <Loader2 className={cn('animate-spin', iconSizes[size])} />
            ) : (
                <RotateCcw className={iconSizes[size]} />
            )}
            <span>Regenerate</span>
            {showCost && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-white/20 text-white/90">
                    5 credits
                </span>
            )}
        </button>
    )
}