// Main component
export { default as ResultsGallery } from './ResultsGallery'

// Types
export type {
    TryOnResult,
    SortBy,
    SortOrder,
    ResultsGalleryProps,
    ResultCardProps
} from './types'

// Hooks
export { useResultsGallery } from './hooks/useResultsGallery'
export { useFavorites } from './hooks/useFavorites'
export { useFilters } from './hooks/useFilters'
export { useSelection } from './hooks/useSelection'

// Components
export { ResultCard } from './components/ResultCard'
export { SearchBar } from './components/SearchBar'
export { FilterChips } from './components/FilterChips'
export { BulkActions } from './components/BulkActions'
export { DateHeader } from './components/DateHeader'
export { LoadingState } from './components/LoadingState'
export { ErrorState } from './components/ErrorState'
export { EmptyState, EmptyFilteredState } from './components/EmptyState'
