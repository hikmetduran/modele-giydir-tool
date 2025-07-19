'use client'

import { Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface DateHeaderProps {
    dateKey: string
    count: number
}

export function DateHeader({ dateKey, count }: DateHeaderProps) {
    return (
        <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-900">
                    {formatDate(dateKey)}
                </h2>
            </div>
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-sm text-gray-500">
                {count} result{count !== 1 ? 's' : ''}
            </span>
        </div>
    )
}
