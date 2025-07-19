'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { databases, COLLECTIONS } from '@/lib/appwrite'
import { Query } from 'appwrite'

interface Wallet {
    id: string
    user_id: string
    credits: number
    created_at: string
    updated_at: string
}

interface CreditTransaction {
    id: string
    user_id: string
    amount: number
    transaction_type: 'credit' | 'debit' | 'try_on_generation' | 'refund'
    description: string
    created_at: string
    related_job_id?: string
}

interface UseWalletReturn {
    wallet: Wallet | null
    transactions: CreditTransaction[]
    loading: boolean
    error: string | null
    refreshWallet: () => Promise<void>
}

export function useWallet(): UseWalletReturn {
    const { user, userId } = useAuth()
    const [wallet, setWallet] = useState<Wallet | null>(null)
    const [transactions, setTransactions] = useState<CreditTransaction[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const loadWallet = useCallback(async () => {
        if (!userId) {
            setWallet(null)
            setTransactions([])
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setError(null)

            // Load wallet data
            const walletResponse = await databases.listDocuments(
                'modele-giydir-db',
                COLLECTIONS.wallets,
                [Query.equal('user_id', userId)]
            )

            let walletData: Wallet | null = null
            if (walletResponse.documents.length > 0) {
                walletData = walletResponse.documents[0] as any
            } else {
                // Create wallet if it doesn't exist
                const newWallet = await databases.createDocument(
                    'modele-giydir-db',
                    COLLECTIONS.wallets,
                    'unique()',
                    {
                        user_id: userId,
                        credits: 100, // Starting credits
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                )
                walletData = newWallet as any
            }

            // Load transaction history
            const transactionsResponse = await databases.listDocuments(
                'modele-giydir-db',
                COLLECTIONS.creditTransactions,
                [
                    Query.equal('user_id', userId),
                    Query.orderDesc('$createdAt'),
                    Query.limit(50)
                ]
            )

            // Map Appwrite documents to our interface
            const mappedTransactions: CreditTransaction[] = transactionsResponse.documents.map(doc => ({
                id: doc.$id,
                user_id: doc.user_id || doc.userId,
                amount: doc.amount || 0,
                transaction_type: doc.transaction_type || doc.type || 'debit',
                description: doc.description || 'Transaction',
                created_at: doc.$createdAt || doc.created_at || new Date().toISOString(),
                related_job_id: doc.related_job_id || doc.try_on_result_id
            }))

            setWallet(walletData)
            setTransactions(mappedTransactions)
            console.log('💰 Wallet loaded successfully:', walletData?.credits)
        } catch (err) {
            console.error('Error loading wallet:', err)
            setError(err instanceof Error ? err.message : 'Failed to load wallet')

            // Set a fallback wallet if there's an error
            setWallet({
                id: '',
                user_id: userId,
                credits: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
        } finally {
            setLoading(false)
        }
    }, [userId])

    const refreshWallet = useCallback(async () => {
        console.log('🔄 Refreshing wallet balance...')
        await loadWallet()
    }, [loadWallet])

    // Debounced refresh to prevent excessive calls
    const debouncedRefresh = useCallback(() => {
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current)
        }
        refreshTimeoutRef.current = setTimeout(() => {
            refreshWallet()
        }, 1000) // Wait 1 second before refreshing
    }, [refreshWallet])

    // Load wallet on mount and when user changes
    useEffect(() => {
        loadWallet()
    }, [loadWallet])

    // Set up real-time subscription for wallet updates
    useEffect(() => {
        if (!userId) return

        // Note: Appwrite real-time subscriptions would go here
        // For now, we'll use polling

        return () => {
            // Clear any pending refresh timeout
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current)
            }
        }
    }, [userId, debouncedRefresh])

    return {
        wallet,
        transactions,
        loading,
        error,
        refreshWallet
    }
}
