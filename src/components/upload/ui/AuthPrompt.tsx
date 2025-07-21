'use client'

import { ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuthPromptProps {
    className?: string
}

export function AuthPrompt({ className }: AuthPromptProps) {
    return (
        <div className={cn('w-full', className)}>
            <div className="text-center py-12">
                <ImageIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Sign in to upload images</h3>
                <p className="text-gray-500">Please sign in to access your images and upload new ones</p>
            </div>
        </div>
    )
}