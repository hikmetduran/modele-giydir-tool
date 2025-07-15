'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { testDatabaseConnection, testStorageConnection, debugUserProductImages, getProductImageId, getModelPhotoId } from '@/lib/supabase-storage'

export default function TestDebugPage() {
    const { user } = useAuth()
    const [output, setOutput] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)

    const addOutput = (text: string) => {
        setOutput(prev => prev + '\n' + text)
    }

    const testDatabase = async () => {
        setIsLoading(true)
        addOutput('🧪 Testing database connection...')

        try {
            const result = await testDatabaseConnection()
            addOutput(`✅ Database test: ${JSON.stringify(result, null, 2)}`)
        } catch (error) {
            addOutput(`❌ Database test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }

        setIsLoading(false)
    }

    const testStorage = async () => {
        setIsLoading(true)
        addOutput('🧪 Testing storage connection...')

        try {
            const result = await testStorageConnection()
            addOutput(`✅ Storage test: ${JSON.stringify(result, null, 2)}`)
        } catch (error) {
            addOutput(`❌ Storage test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }

        setIsLoading(false)
    }

    const debugUserImages = async () => {
        if (!user) {
            addOutput('❌ No user signed in')
            return
        }

        setIsLoading(true)
        addOutput('🔍 Debugging user product images...')

        try {
            const result = await debugUserProductImages(user.id)
            addOutput(`✅ User images: ${JSON.stringify(result, null, 2)}`)
        } catch (error) {
            addOutput(`❌ User images debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }

        setIsLoading(false)
    }

    const testProductImageLookup = async () => {
        if (!user) {
            addOutput('❌ No user signed in')
            return
        }

        setIsLoading(true)
        addOutput('🔍 Testing product image lookup with timeout...')

        try {
            const filename = "Black Women's T-Shirt.jpg"
            addOutput(`Looking up: ${filename}`)
            const result = await getProductImageId(user.id, filename)
            addOutput(`✅ Product image lookup result: ${result}`)
        } catch (error) {
            addOutput(`❌ Product image lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }

        setIsLoading(false)
    }

    const testModelPhotoLookup = async () => {
        setIsLoading(true)
        addOutput('🔍 Testing model photo lookup with timeout...')

        try {
            const modelId = "f4e3f2fe-abb9-4cca-be91-23c3f89d1d58"
            addOutput(`Looking up: ${modelId}`)
            const result = await getModelPhotoId(modelId)
            addOutput(`✅ Model photo lookup result: ${result}`)
        } catch (error) {
            addOutput(`❌ Model photo lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }

        setIsLoading(false)
    }

    const clearOutput = () => {
        setOutput('')
    }

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <h1 className="text-2xl font-bold mb-6">Debug & Test Page</h1>

            <div className="mb-6">
                <p className="text-gray-600 mb-4">
                    This page helps debug database connection and lookup issues.
                </p>

                {!user && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <p className="text-yellow-800">Please sign in to test user-specific functions.</p>
                    </div>
                )}

                <div className="flex flex-wrap gap-3 mb-4">
                    <button
                        onClick={testDatabase}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        Test Database
                    </button>

                    <button
                        onClick={testStorage}
                        disabled={isLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                        Test Storage
                    </button>

                    <button
                        onClick={debugUserImages}
                        disabled={isLoading || !user}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                        Debug User Images
                    </button>

                    <button
                        onClick={testProductImageLookup}
                        disabled={isLoading || !user}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                    >
                        Test Product Lookup
                    </button>

                    <button
                        onClick={testModelPhotoLookup}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                        Test Model Lookup
                    </button>

                    <button
                        onClick={clearOutput}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                        Clear Output
                    </button>
                </div>
            </div>

            <div className="bg-gray-100 rounded-lg p-4 min-h-[400px]">
                <h2 className="text-lg font-semibold mb-3">Test Output:</h2>
                <pre className="text-sm whitespace-pre-wrap font-mono text-gray-800">
                    {output || 'Click a test button to see output...'}
                </pre>
            </div>
        </div>
    )
} 