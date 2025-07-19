import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { groupByDate, sortDateGroups } from '@/lib/utils'
import type { TryOnResult, SortBy, SortOrder } from '../types'

// Mock function - replace with actual implementation from your storage layer
const getUserTryOnResultsGroupedByDate = async (userId: string) => {
    // This is a mock implementation - replace with actual API call
    return {
        success: true,
        data: [] as TryOnResult[]
    }
}

interface UseResultsGalleryReturn {
    results: TryOnResult[]
    loading: boolean
    error: string | null
    groupedResults: [string, TryOnResult[]][]
    uniqueGenders: string[]
    loadResults: () => Promise<void>
}

export function useResultsGallery(): UseResultsGalleryReturn {
    const { user } = useAuth()
    const [results, setResults] = useState<TryOnResult[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadResults = useCallback(async () => {
        if (!user) return

        setLoading(true)
        setError(null)

        try {
            const userId = (user as any).id || ''
            const response = await getUserTryOnResultsGroupedByDate(userId)
            if (response.success) {
                setResults(response.data as TryOnResult[])
            } else {
                setError('Failed to load results')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }, [user])

    // Load data on mount
    useEffect(() => {
        loadResults()
    }, [user, loadResults])

    // Group results by date
    const groupedResults = useMemo(() => {
        return sortDateGroups(groupByDate(results))
    }, [results])

    // Get unique values for filters
    const uniqueGenders = useMemo(() => {
        return [...new Set(results.map(r => r.model_photos.gender))].filter(Boolean)
    }, [results])

    return {
        results,
        loading,
        error,
        groupedResults,
        uniqueGenders,
        loadResults
    }
}
