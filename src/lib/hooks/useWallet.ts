'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { getUserWallet, getCreditTransactions, supabase } from '@/lib/supabase'
import type { Wallet, CreditTransaction } from '@/lib/supabase'

interface UseWalletReturn {
    wallet: Wallet | null
    transactions: CreditTransaction[]
    loading: boolean
    error: string | null
    refreshWallet: () => Promise<void>
}

export function useWallet(): UseWalletReturn {
    const { user } = useAuth()
    const [wallet, setWallet] = useState<Wallet | null>(null)
    const [transactions, setTransactions] = useState<CreditTransaction[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const loadWallet = useCallback(async () => {
        if (!user) {
            setWallet(null)
            setTransactions([])
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setError(null)

            // Load wallet data
            const { data: walletData, error: walletError } = await getUserWallet(user.id)
            if (walletError) {
                console.error('Wallet error:', walletError)
                throw new Error(walletError.message)
            }

            // Load transaction history
            const { data: transactionData, error: transactionError } = await getCreditTransactions(user.id)
            if (transactionError) {
                console.error('Failed to load transactions:', transactionError)
                // Don't throw here, wallet is more important than transaction history
            }

            // Create a new object reference to ensure React detects the change
            setWallet(walletData ? { ...walletData } : null)
            setTransactions(transactionData || [])
        } catch (err) {
            console.error('Error loading wallet:', err)
            setError(err instanceof Error ? err.message : 'Failed to load wallet')

            // Set a fallback wallet if there's an error
            setWallet({
                id: '',
                user_id: user.id,
                credits: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
        } finally {
            setLoading(false)
        }
    }, [user])

    const refreshWallet = useCallback(async () => {
        await loadWallet()
    }, [loadWallet])

    // Debounced refresh to prevent excessive calls
    const debouncedRefresh = useCallback(() => {
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current)
        }
        refreshTimeoutRef.current = setTimeout(() => {
            loadWallet()
        }, 1000) // Wait 1 second before refreshing
    }, [loadWallet])

    // Load wallet on mount and when user changes
    useEffect(() => {
        loadWallet()
    }, [loadWallet])

    // Set up real-time subscription for wallet updates
    useEffect(() => {
        if (!user) return

        const walletChannel = supabase
            .channel('wallet-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'wallets',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    if (payload.eventType === 'UPDATE' && payload.new) {
                        setWallet({ ...(payload.new as Wallet) })
                    }
                    // Also trigger a debounced refresh to ensure consistency
                    debouncedRefresh()
                }
            )
            .subscribe()

        const transactionChannel = supabase
            .channel('transaction-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'credit_transactions',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    if (payload.new) {
                        setTransactions(prev => [payload.new as CreditTransaction, ...prev])
                    }
                    // Also trigger a debounced refresh to ensure wallet balance is consistent
                    debouncedRefresh()
                }
            )
            .subscribe()

        return () => {
            walletChannel.unsubscribe()
            transactionChannel.unsubscribe()
            // Clear any pending refresh timeout
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current)
            }
        }
    }, [user, debouncedRefresh])

    return {
        wallet,
        transactions,
        loading,
        error,
        refreshWallet
    }
} 