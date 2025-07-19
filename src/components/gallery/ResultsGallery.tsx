'use client'

import { cn } from '@/lib/utils'
import { useResultsGallery } from './hooks/useResultsGallery'
import { useFavorites } from './hooks/useFavorites'
import { useFilters } from './hooks/useFilters'
import { useSelection } from './hooks/useSelection'
import { ResultCard } from './components/ResultCard'
import { SearchBar } from './components/SearchBar'
import { FilterChips } from './components/FilterChips'
import { BulkActions } from './components/BulkActions'
import { DateHeader } from './components/DateHeader'
import { LoadingState } from './components/LoadingState'
import { ErrorState } from './components/ErrorState'
import { EmptyState, EmptyFilteredState } from './components/EmptyState'
import type { ResultsGalleryProps } from './types'

export default function ResultsGallery({ className }: ResultsGalleryProps) {
    const { results, loading, error, groupedResults, uniqueGenders, loadResults } = useResultsGallery()
    const { favorites, toggleFavorite, saveFavorites } = useFavorites()
    const { searchTerm, setSearchTerm, filterGender, setFilterGender, filteredAndSortedResults } = useFilters({ results })
    const { selectedResults, showBulkActions, toggleSelection, selectAll, deselectAll } = useSelection()

    // Handle bulk favorite action
    const handleFavoriteSelected = () => {
        const newFavorites = new Set(favorites)
        selectedResults.forEach(id => newFavorites.add(id))
        saveFavorites(newFavorites)
        deselectAll()
    }

    if (loading) {
        return <LoadingState />
    }

    if (error) {
        return <ErrorState error={error} onRetry={loadResults} />
    }

    if (results.length === 0) {
        return <EmptyState />
    }

    return (
        <div className={cn('max-w-7xl mx-auto', className)}>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Results Gallery</h1>
                <p className="text-gray-600 mt-2">
                    {results.length} result{results.length !== 1 ? 's' : ''} in total
                </p>
            </div>

            {/* Search and Filters */}
            <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
            <FilterChips 
                filterGender={filterGender} 
                onFilterChange={setFilterGender} 
                uniqueGenders={uniqueGenders} 
            />

            {/* Bulk Actions */}
            {showBulkActions && (
                <BulkActions
                    selectedResults={selectedResults}
                    filteredResults={filteredAndSortedResults}
                    onDeselectAll={deselectAll}
                    onFavoriteSelected={handleFavoriteSelected}
                />
            )}

            {/* Results */}
            {filteredAndSortedResults.length === 0 ? (
                <EmptyFilteredState />
            ) : (
                <div className="space-y-8">
                    {groupedResults.map(([dateKey, dateResults]) => (
                        <div key={dateKey} className="space-y-4">
                            <DateHeader dateKey={dateKey} count={dateResults.length} />
                            
                            <div className="space-y-4">
                                {dateResults.map((result) => (
                                    <ResultCard
                                        key={result.id}
                                        result={result}
                                        isSelected={selectedResults.has(result.id)}
                                        isFavorite={favorites.has(result.id)}
                                        onToggleSelection={() => toggleSelection(result.id)}
                                        onToggleFavorite={() => toggleFavorite(result.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
