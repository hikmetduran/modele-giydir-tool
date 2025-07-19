'use client'

import { cn } from '@/lib/utils'

interface FilterChipsProps {
    filterGender: string
    onFilterChange: (gender: string) => void
    uniqueGenders: string[]
}

export function FilterChips({ filterGender, onFilterChange, uniqueGenders }: FilterChipsProps) {
    return (
        <div className="mb-4">
            <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Model Gender:</span>
                <button
                    onClick={() => onFilterChange('all')}
                    className={cn(
                        'px-3 py-1 text-sm rounded-full transition-colors',
                        filterGender === 'all'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    )}
                >
                    All
                </button>
                {uniqueGenders.map(gender => (
                    <button
                        key={gender}
                        onClick={() => onFilterChange(gender)}
                        className={cn(
                            'px-3 py-1 text-sm rounded-full transition-colors',
                            filterGender === gender
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        )}
                    >
                        {gender.charAt(0).toUpperCase() + gender.slice(1)}
                    </button>
                ))}
            </div>
        </div>
    )
}
