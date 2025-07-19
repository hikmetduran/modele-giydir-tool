'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { account } from '@/lib/appwrite'
import { Models } from 'appwrite'

interface AuthContextType {
    user: Models.User<Models.Preferences> | null
    userId: string | null
    loading: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

interface AuthProviderProps {
    children: ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Get initial user session
        const initializeAuth = async () => {
            try {
                const currentUser = await account.get()
                setUser(currentUser)
                setUserId(currentUser.$id)
            } catch (error) {
                // User is not logged in or session expired
                setUser(null)
                setUserId(null)
            } finally {
                setLoading(false)
            }
        }

        initializeAuth()

        // Listen for auth changes using Appwrite's subscribe method
        const unsubscribe = account.client.subscribe('account', (response) => {
            if (response.events.includes('account.sessions.*')) {
                // Session changed, refresh user
                account.get()
                    .then((currentUser) => {
                        setUser(currentUser)
                        setUserId(currentUser.$id)
                    })
                    .catch(() => {
                        setUser(null)
                        setUserId(null)
                    })
            }
        })

        return () => {
            unsubscribe()
        }
    }, [])

    const signOut = async () => {
        try {
            await account.deleteSession('current')
            setUser(null)
            setUserId(null)
        } catch (error) {
            console.error('Error signing out:', error)
            // Even if there's an error, clear the user state
            setUser(null)
            setUserId(null)
        }
    }

    const value = {
        user,
        userId,
        loading,
        signOut,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
