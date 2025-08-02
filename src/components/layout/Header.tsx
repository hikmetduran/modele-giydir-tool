'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Upload, LogIn, LogOut, User, Image as ImageIcon, Coins } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useState, useEffect, useRef, useCallback } from 'react'
import AuthModal from '@/components/auth/AuthModal'
import { useWallet } from '@/lib/hooks/useWallet'

const navigation = [
    { name: 'Try-On', href: '/', icon: Upload },
    { name: 'Gallery', href: '/gallery', icon: ImageIcon },
]

export default function Header() {
    const pathname = usePathname()
    const { user, loading, signOut } = useAuth()
    const walletHookResult = useWallet()
    const { wallet, loading: walletLoading } = walletHookResult
    const [displayCredits, setDisplayCredits] = useState<number>(0)
    
    // Update display credits when wallet changes
    useEffect(() => {
        if (wallet?.credits !== undefined) {
            setDisplayCredits(wallet.credits)
        }
    }, [wallet?.credits])
    const [authModalOpen, setAuthModalOpen] = useState(false)
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const [userProfile, setUserProfile] = useState<{ full_name?: string | null } | null>(null)
    const userMenuRef = useRef<HTMLDivElement>(null)

    const handleSignOut = async () => {
        await signOut()
        setUserMenuOpen(false)
    }

    const getInitials = (name: string | null) => {
        if (!name) return 'U'
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    // Load user profile function
    const loadProfile = useCallback(async () => {
        if (!user) return

        try {
            // Use auth.user metadata instead of profiles table
            const profileData = {
                full_name: user.user_metadata?.full_name || null,
                avatar_url: user.user_metadata?.avatar_url || null
            }
            setUserProfile(profileData)
        } catch (err) {
            console.error('Error loading profile:', err)
        }
    }, [user])

    // Load user profile when user is authenticated
    useEffect(() => {
        if (user) {
            loadProfile()
        } else {
            setUserProfile(null)
        }
    }, [user, loadProfile])


    // Listen for profile updates
    useEffect(() => {
        const handleProfileUpdate = () => {
            loadProfile()
        }

        window.addEventListener('profileUpdated', handleProfileUpdate)
        return () => {
            window.removeEventListener('profileUpdated', handleProfileUpdate)
        }
    }, [loadProfile])

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    // Listen for global wallet update events
    useEffect(() => {
        const handleWalletUpdate = () => {
            walletHookResult.refreshWallet()
        }

        window.addEventListener('walletUpdated', handleWalletUpdate as EventListener)
        return () => {
            window.removeEventListener('walletUpdated', handleWalletUpdate as EventListener)
        }
    }, [walletHookResult])

    return (
        <header className="border-b bg-white">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center">
                        <Link href={process.env.NEXT_PUBLIC_LANDING_URL || "https://modelegiydir.com"} className="flex items-center space-x-3">
                            <Image
                                src="/logo.png"
                                alt="Modele Giydir Logo"
                                width={32}
                                height={32}
                                className="rounded-lg"
                            />
                            <span className="text-xl font-bold text-gray-900">Modele Giydir</span>
                        </Link>
                    </div>

                    <nav className="flex space-x-8">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        'inline-flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                                        isActive
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.name}</span>
                                </Link>
                            )
                        })}
                    </nav>

                    <div className="flex items-center space-x-4">
                        {loading ? (
                            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
                        ) : user ? (
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center space-x-2 rounded-full hover:bg-gray-100 transition-colors p-1"
                                >
                                    <div className="flex items-center space-x-2 px-2">
                                        <Coins className="h-4 w-4 text-yellow-500" />
                                        <span className="text-sm font-semibold text-gray-600">
                                            {walletLoading ? '...' : `${displayCredits} credits`}
                                        </span>
                                    </div>
                                    <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                        {getInitials(userProfile?.full_name || user.user_metadata?.full_name)}
                                    </div>
                                </button>

                                {userMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                                        <div className="py-1">
                                            <div className="px-4 py-2 text-sm text-gray-900 border-b">
                                                <div className="font-medium">{userProfile?.full_name || user.user_metadata?.full_name || 'User'}</div>
                                                <div className="text-gray-500">{user.email}</div>
                                            </div>
                                            <Link
                                                href="/profile"
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                                                onClick={() => setUserMenuOpen(false)}
                                            >
                                                <User className="inline h-4 w-4 mr-2" />
                                                Profile
                                            </Link>
                                            <button
                                                onClick={handleSignOut}
                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                                            >
                                                <LogOut className="inline h-4 w-4 mr-2" />
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => setAuthModalOpen(true)}
                                className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
                            >
                                <LogIn className="h-4 w-4" />
                                <span>Sign In</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <AuthModal
                isOpen={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
            />
        </header>
    )
}
