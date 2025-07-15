import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function generateId(): string {
    return Math.random().toString(36).substr(2, 9)
}

export function isValidImageType(type: string) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    return validTypes.includes(type)
}

export function compressImage(file: File, quality = 0.8): Promise<File> {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()

        img.onload = () => {
            const maxWidth = 1024
            const maxHeight = 1024

            let { width, height } = img

            if (width > height) {
                if (width > maxWidth) {
                    height = (height * maxWidth) / width
                    width = maxWidth
                }
            } else {
                if (height > maxHeight) {
                    width = (width * maxHeight) / height
                    height = maxHeight
                }
            }

            canvas.width = width
            canvas.height = height

            ctx?.drawImage(img, 0, 0, width, height)

            canvas.toBlob((blob) => {
                if (blob) {
                    const compressedFile = new File([blob], file.name, {
                        type: file.type,
                        lastModified: Date.now(),
                    })
                    resolve(compressedFile)
                } else {
                    resolve(file)
                }
            }, file.type, quality)
        }

        img.src = URL.createObjectURL(file)
    })
}

// Date utility functions for gallery
export function formatTimeAgo(date: Date | string): string {
    const now = new Date()
    const targetDate = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000)

    if (diffInSeconds < 60) {
        return 'Just now'
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60)
        return `${minutes}m ago`
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600)
        return `${hours}h ago`
    } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400)
        return `${days}d ago`
    } else if (diffInSeconds < 31536000) {
        const months = Math.floor(diffInSeconds / 2592000)
        return `${months}mo ago`
    } else {
        const years = Math.floor(diffInSeconds / 31536000)
        return `${years}y ago`
    }
}

export function formatDate(date: Date | string): string {
    const targetDate = new Date(date)
    return targetDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

export function formatDateTime(date: Date | string): string {
    const targetDate = new Date(date)
    return targetDate.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

export function formatTime(date: Date | string): string {
    const targetDate = new Date(date)
    return targetDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    })
}

export function getDateKey(date: Date | string): string {
    const targetDate = new Date(date)
    return targetDate.toDateString()
}

export function groupByDate<T extends { created_at: string }>(items: T[]): Record<string, T[]> {
    return items.reduce((groups, item) => {
        const dateKey = getDateKey(item.created_at)
        if (!groups[dateKey]) {
            groups[dateKey] = []
        }
        groups[dateKey].push(item)
        return groups
    }, {} as Record<string, T[]>)
}

export function sortDateGroups(groups: Record<string, any[]>): [string, any[]][] {
    return Object.entries(groups).sort(([a], [b]) => {
        return new Date(b).getTime() - new Date(a).getTime()
    })
}

// File size formatting
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Download utility
export async function downloadImage(url: string, filename: string): Promise<void> {
    try {
        const response = await fetch(url)
        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = objectUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()

        document.body.removeChild(link)
        URL.revokeObjectURL(objectUrl)
    } catch (error) {
        console.error('Download failed:', error)
        // Fallback: open in new tab
        window.open(url, '_blank')
    }
}

// Bulk download utility
export async function downloadMultipleImages(
    images: { url: string; filename: string }[],
    delay: number = 500
): Promise<void> {
    for (let i = 0; i < images.length; i++) {
        const { url, filename } = images[i]
        await downloadImage(url, filename)

        // Add delay between downloads to avoid overwhelming the browser
        if (i < images.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delay))
        }
    }
} 