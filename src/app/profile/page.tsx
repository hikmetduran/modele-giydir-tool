'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { User, Mail, Calendar, Edit2, Save, X, Coins, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@/lib/hooks/useWallet'

interface ProfileData {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
    created_at: string
    updated_at: string
}

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth()
    const { wallet, transactions, loading: walletLoading, refreshWallet } = useWallet()
    const router = useRouter()
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [formData, setFormData] = useState({
        full_name: ''
    })

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/')
        }
    }, [user, authLoading, router])

    const loadProfile = useCallback(async () => {
        try {
            // Use auth.user metadata instead of profiles table
            const profileData: ProfileData = {
                id: user!.id,
                email: user!.email!,
                full_name: user!.user_metadata?.full_name || null,
                avatar_url: user!.user_metadata?.avatar_url || null,
                created_at: user!.created_at || new Date().toISOString(),
                updated_at: user!.updated_at || new Date().toISOString()
            }
            
            setProfile(profileData)
            setFormData({
                full_name: profileData.full_name || ''
            })
        } catch (err: unknown) {
            console.error('Error loading profile:', err)
            setError('Failed to load profile')
        } finally {
            setLoading(false)
        }
    }, [user])

    // Load profile data
    useEffect(() => {
        if (user) {
            loadProfile()
        }
    }, [user, loadProfile])

    const handleSave = async () => {
        if (!user) return

        setSaving(true)
        setError('')
        setSuccess('')

        try {
            // Update user metadata instead of profiles table
            const { error } = await supabase.auth.updateUser({
                data: { full_name: formData.full_name }
            })

            if (error) throw error

            // Update local profile state
            const updatedProfile: ProfileData = {
                ...profile!,
                full_name: formData.full_name || null,
                updated_at: new Date().toISOString()
            }
            
            setProfile(updatedProfile)
            setEditing(false)
            setSuccess('Profile updated successfully!')

            // Trigger custom event to update header
            window.dispatchEvent(new CustomEvent('profileUpdated'))
        } catch (err: unknown) {
            console.error('Error updating profile:', err)
            setError('Failed to update profile')
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => {
        setFormData({
            full_name: profile?.full_name || ''
        })
        setEditing(false)
        setError('')
        setSuccess('')
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

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading profile...</p>
                </div>
            </div>
        )
    }

    if (!user || !profile) {
        return null
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="h-20 w-20 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                                    {getInitials(profile.full_name)}
                                </div>
                                <div className="text-white">
                                    <h1 className="text-2xl font-bold">
                                        {profile.full_name || 'User Profile'}
                                    </h1>
                                    <p className="text-purple-100">{profile.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => editing ? handleCancel() : setEditing(true)}
                                className="bg-white text-purple-600 px-4 py-2 rounded-md hover:bg-gray-100 transition-colors inline-flex items-center space-x-2"
                            >
                                {editing ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                                <span>{editing ? 'Cancel' : 'Edit Profile'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {error && (
                            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                                {success}
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Full Name
                                </label>
                                {editing ? (
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        placeholder="Enter your full name"
                                    />
                                ) : (
                                    <div className="flex items-center space-x-2 text-gray-900">
                                        <User className="h-4 w-4 text-gray-400" />
                                        <span>{profile.full_name || 'Not set'}</span>
                                    </div>
                                )}
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <div className="flex items-center space-x-2 text-gray-900">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    <span>{profile.email}</span>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        Cannot be changed
                                    </span>
                                </div>
                            </div>

                            {/* Member Since */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Member Since
                                </label>
                                <div className="flex items-center space-x-2 text-gray-900">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span>{new Date(profile.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            {/* Credits Section */}
                            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border border-yellow-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                                        <Coins className="h-5 w-5 text-yellow-600" />
                                        <span>Credits</span>
                                    </h3>
                                    <button
                                        onClick={refreshWallet}
                                        disabled={walletLoading}
                                        className="text-yellow-600 hover:text-yellow-700 disabled:opacity-50"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${walletLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                                <div className="text-3xl font-bold text-yellow-800 mb-2">
                                    {walletLoading ? '...' : wallet?.credits || 0}
                                </div>
                                <p className="text-sm text-yellow-700">
                                    Each try-on generation costs 10 credits
                                </p>
                            </div>

                            {/* Transaction History */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
                                {walletLoading ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                                        <p className="mt-2 text-gray-600">Loading transactions...</p>
                                    </div>
                                ) : transactions.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <Coins className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                        <p>No transactions yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                        {transactions.slice(0, 20).map((transaction) => (
                                            <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    {transaction.transaction_type === 'debit' ? (
                                                        <TrendingDown className="h-4 w-4 text-red-500" />
                                                    ) : (
                                                        <TrendingUp className="h-4 w-4 text-green-500" />
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {transaction.description || 'Transaction'}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {new Date(transaction.created_at).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={`text-sm font-medium ${transaction.transaction_type === 'debit'
                                                    ? 'text-red-600'
                                                    : 'text-green-600'
                                                    }`}>
                                                    {transaction.transaction_type === 'debit' ? '-' : '+'}
                                                    {Math.abs(transaction.amount)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Save Button */}
                            {editing && (
                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={handleCancel}
                                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2"
                                    >
                                        {saving ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        ) : (
                                            <Save className="h-4 w-4" />
                                        )}
                                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
