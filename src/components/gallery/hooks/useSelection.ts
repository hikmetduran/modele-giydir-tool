import { useState, useCallback } from 'react'

interface UseSelectionReturn {
    selectedResults: Set<string>
    showBulkActions: boolean
    toggleSelection: (id: string) => void
    selectAll: (results: any[]) => void
    deselectAll: () => void
}

export function useSelection(): UseSelectionReturn {
    const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set())
    const [showBulkActions, setShowBulkActions] = useState(false)

    const toggleSelection = useCallback((id: string) => {
        const newSelected = new Set(selectedResults)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedResults(newSelected)
        setShowBulkActions(newSelected.size > 0)
    }, [selectedResults])

    const selectAll = useCallback((results: any[]) => {
        setSelectedResults(new Set(results.map(r => r.id)))
        setShowBulkActions(true)
    }, [])

    const deselectAll = useCallback(() => {
        setSelectedResults(new Set())
        setShowBulkActions(false)
    }, [])

    return {
        selectedResults,
        showBulkActions,
        toggleSelection,
        selectAll,
        deselectAll
    }
}
