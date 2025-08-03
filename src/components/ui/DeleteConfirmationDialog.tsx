'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AlertTriangle, X, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DependentResult {
    id: string
    created_at: string
    result_image_url: string
    model_photos: {
        id: string
        name: string
        image_url: string
    }
}

interface DeleteConfirmationDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => Promise<void>
    productImage: {
        id: string
        original_filename: string
        image_url: string
    }
    dependencies: DependentResult[]
}

export function DeleteConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    productImage,
    dependencies
}: DeleteConfirmationDialogProps) {
    const [isConfirming, setIsConfirming] = useState(false)

    if (!isOpen) return null

    const handleConfirm = async () => {
        setIsConfirming(true)
        try {
            await onConfirm()
        } finally {
            setIsConfirming(false)
        }
    }

    const hasDependencies = dependencies.length > 0

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={!isConfirming ? onClose : undefined}
            />
            
            {/* Dialog */}
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className={cn(
                            "p-2 rounded-full",
                            hasDependencies ? "bg-red-100" : "bg-yellow-100"
                        )}>
                            <AlertTriangle className={cn(
                                "h-5 w-5",
                                hasDependencies ? "text-red-600" : "text-yellow-600"
                            )} />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                {hasDependencies ? 'Delete Image and Results?' : 'Delete Image?'}
                            </h2>
                            <p className="text-sm text-gray-500">
                                This action cannot be undone
                            </p>
                        </div>
                    </div>
                    {!isConfirming && (
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {/* Product Image Preview */}
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Image to be deleted:</h3>
                        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                            <Image
                                src={productImage.image_url}
                                alt={productImage.original_filename}
                                width={80}
                                height={80}
                                className="w-20 h-20 rounded-lg object-cover"
                            />
                            <div>
                                <p className="font-medium text-gray-900">{productImage.original_filename}</p>
                                <p className="text-sm text-gray-500">Product image</p>
                            </div>
                        </div>
                    </div>

                    {/* Dependencies Warning */}
                    {hasDependencies && (
                        <div className="mb-6">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                <div className="flex items-start space-x-3">
                                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-medium text-red-900 mb-1">
                                            Warning: This will also delete {dependencies.length} generated result{dependencies.length !== 1 ? 's' : ''}
                                        </h4>
                                        <p className="text-sm text-red-700">
                                            These try-on results use this image and will be permanently removed from your gallery.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-sm font-medium text-gray-700 mb-3">
                                Results that will be deleted:
                            </h3>
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                                {dependencies.map((result) => (
                                    <div key={result.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                                        <Image
                                            src={productImage.image_url}
                                            alt={productImage.original_filename}
                                            width={60}
                                            height={60}
                                            className="w-15 h-20 rounded-lg object-cover"
                                        />
                                        <div className="text-gray-400 text-2xl">→</div>
                                        <Image
                                            src={result.result_image_url}
                                            alt="Try-on result"
                                            width={60}
                                            height={60}
                                            className="w-15 h-20 rounded-lg object-cover"
                                        />
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">Try-on Result</p>
                                            <p className="text-sm text-gray-500">
                                                Created {new Date(result.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Simple confirmation for images without dependencies */}
                    {!hasDependencies && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="font-medium text-yellow-900 mb-1">
                                        Are you sure you want to delete this image?
                                    </h4>
                                    <p className="text-sm text-yellow-700">
                                        This image will be permanently removed from your gallery and cannot be recovered.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        disabled={isConfirming}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isConfirming}
                        className={cn(
                            "px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2",
                            hasDependencies 
                                ? "bg-red-600 hover:bg-red-700" 
                                : "bg-yellow-600 hover:bg-yellow-700"
                        )}
                    >
                        {isConfirming ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Deleting...</span>
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4" />
                                <span>
                                    {hasDependencies 
                                        ? `Delete Image & ${dependencies.length} Result${dependencies.length !== 1 ? 's' : ''}`
                                        : 'Delete Image'
                                    }
                                </span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}