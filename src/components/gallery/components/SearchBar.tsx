'use client'

import { Search } from 'lucide-react'

interface SearchBarProps {
    searchTerm: string
    onSearchChange: (term: string) => void
}

export function SearchBar({ searchTerm, onSearchChange }: SearchBarProps) {
    return (
        <div className="mb-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-600" />
                <input
                    type="text"
                    placeholder="Search by product name or model..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-400 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
            </div>
        </div>
    )
}
