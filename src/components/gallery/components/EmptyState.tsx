'use client'

export function EmptyState() {
    return (
        <div className="text-center py-12">
            <div className="text-gray-500 mb-2">No results found</div>
            <div className="text-gray-400">Start creating some try-on images to see them here!</div>
        </div>
    )
}

export function EmptyFilteredState() {
    return (
        <div className="text-center py-12">
            <div className="text-gray-500 mb-2">No results match your filters</div>
            <div className="text-gray-400">Try adjusting your search or filters</div>
        </div>
    )
}
