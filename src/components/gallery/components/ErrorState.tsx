'use client'

interface ErrorStateProps {
    error: string
    onRetry: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
    return (
        <div className="text-center py-12">
            <div className="text-red-500 mb-2">Error loading results</div>
            <div className="text-gray-600 mb-4">{error}</div>
            <button
                onClick={onRetry}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
                Try Again
            </button>
        </div>
    )
}
