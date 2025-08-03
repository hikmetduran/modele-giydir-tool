'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'warning'

interface ToastProps {
    type: ToastType
    title: string
    message?: string
    duration?: number
    onClose: () => void
}

export function Toast({ type, title, message, duration = 5000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false)
            setTimeout(onClose, 300) // Wait for animation to complete
        }, duration)

        return () => clearTimeout(timer)
    }, [duration, onClose])

    const icons = {
        success: CheckCircle,
        error: XCircle,
        warning: AlertCircle
    }

    const colors = {
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800'
    }

    const iconColors = {
        success: 'text-green-500',
        error: 'text-red-500',
        warning: 'text-yellow-500'
    }

    const Icon = icons[type]

    return (
        <div
            className={cn(
                'w-full transition-all duration-300 transform',
                isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            )}
        >
            <div className={cn(
                'p-4 rounded-lg border shadow-lg',
                colors[type]
            )}>
                <div className="flex items-start space-x-3">
                    <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', iconColors[type])} />
                    <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{title}</h4>
                        {message && (
                            <p className="mt-1 text-sm opacity-90">{message}</p>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            setIsVisible(false)
                            setTimeout(onClose, 300)
                        }}
                        className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}

// Toast manager hook
export function useToast() {
    const [toasts, setToasts] = useState<Array<{
        id: string
        type: ToastType
        title: string
        message?: string
        duration?: number
    }>>([])

    const addToast = (toast: Omit<typeof toasts[0], 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9)
        setToasts(prev => [...prev, { ...toast, id }])
    }

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
    }

    const showSuccess = (title: string, message?: string) => {
        addToast({ type: 'success', title, message })
    }

    const showError = (title: string, message?: string) => {
        addToast({ type: 'error', title, message })
    }

    const showWarning = (title: string, message?: string) => {
        addToast({ type: 'warning', title, message })
    }

    const ToastContainer = () => (
        <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none w-80 max-w-[calc(100vw-2rem)]">
            {toasts.map((toast, index) => (
                <div
                    key={toast.id}
                    style={{ transform: `translateY(${index * 10}px)` }}
                    className="pointer-events-auto"
                >
                    <Toast
                        type={toast.type}
                        title={toast.title}
                        message={toast.message}
                        duration={toast.duration}
                        onClose={() => removeToast(toast.id)}
                    />
                </div>
            ))}
        </div>
    )

    return {
        showSuccess,
        showError,
        showWarning,
        ToastContainer
    }
}