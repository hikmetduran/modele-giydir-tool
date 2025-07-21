'use client'

interface UploadHeaderProps {
    selectedCount: number
    maxFiles: number
    onClearAll: () => void
}

export function UploadHeader({ selectedCount, maxFiles, onClearAll }: UploadHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Images</h2>
                <p className="text-gray-600">
                    {selectedCount} of {maxFiles} images selected
                </p>
            </div>
            <div className="flex items-center space-x-3">
                {selectedCount > 0 && (
                    <button
                        onClick={onClearAll}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                    >
                        Clear All ({selectedCount})
                    </button>
                )}
            </div>
        </div>
    )
}