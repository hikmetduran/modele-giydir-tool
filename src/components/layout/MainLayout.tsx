'use client'

import { ReactNode } from 'react'
import Header from './Header'

interface MainLayoutProps {
    children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
            <footer className="mt-auto border-t bg-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            © 2024 Modele Giydir. All rights reserved.
                        </div>
                        <div className="flex space-x-6">
                            <a href="#" className="text-sm text-gray-500 hover:text-gray-700">
                                Privacy Policy
                            </a>
                            <a href="#" className="text-sm text-gray-500 hover:text-gray-700">
                                Terms of Service
                            </a>
                            <a href="#" className="text-sm text-gray-500 hover:text-gray-700">
                                Support
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
} 