import { useState, useMemo } from 'react'
import type { TryOnResult, SortBy, SortOrder } from '../types'

interface UseFiltersProps {
    results: TryOnResult[]
}

interface UseFiltersReturn {
    searchTerm: string
    setSearchTerm: (term: string) => void
    filterGender: string
    setFilterGender: (gender: string) => void
    sortBy: SortBy
    setSortBy: (sort: SortBy) => void
    sortOrder: SortOrder
    setSortOrder: (order: SortOrder) => void
    filteredAndSortedResults: TryOnResult[]
}

export function useFilters({ results }: UseFiltersProps): UseFiltersReturn {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterGender, setFilterGender] = useState<string>('all')
    const [sortBy, setSortBy] = useState<SortBy>('date')
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

    // Filter and sort results
    const filteredAndSortedResults = useMemo(() => {
        let filtered = [...results]

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(result =>
                result.product_images.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                result.model_photos.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        // Apply gender filter
        if (filterGender !== 'all') {
            filtered = filtered.filter(result => result.model_photos.gender === filterGender)
        }

        // Sort results
        filtered.sort((a, b) => {
            let comparison = 0

            switch (sortBy) {
                case 'date':
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    break
                case 'model':
                    comparison = a.model_photos.name.localeCompare(b.model_photos.name)
                    break
                case 'filename':
                    comparison = a.product_images.original_filename.localeCompare(b.product_images.original_filename)
                    break
            }

            return sortOrder === 'asc' ? comparison : -comparison
        })

        return filtered
    }, [results, searchTerm, filterGender, sortBy, sortOrder])

    return {
        searchTerm,
        setSearchTerm,
        filterGender,
        setFilterGender,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
        filteredAndSortedResults
    }
}
