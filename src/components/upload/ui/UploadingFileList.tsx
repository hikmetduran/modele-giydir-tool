'use client'

import Image from 'next/image'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { formatBytes } from '@/lib/utils'
import { UploadingFile } from '../hooks/useFileUpload'

interface UploadingFileListProps {
    uploadingFiles: UploadingFile[]
    onRetry: (fileId: string) => void
}

export function UploadingFileList({ uploadingFiles, onRetry }: UploadingFileListProps) {
    if (uploadingFiles.length === 0) {
        return null
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                <span>Uploading {uploadingFiles.length} file{uploadingFiles.length !== 1 ? 's' : ''}...</span>
            </h3>

            <div className="space-y-3">
                {uploadingFiles.map((file) => (
                    <div key={file.id} className="flex items-center space-x-4 p-4 bg-white rounded-lg border shadow-sm">
                        <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                            <Image
                                src={file.preview}
                                alt={file.file.name}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{file.file.name}</p>
                            <p className="text-sm text-gray-500">{formatBytes(file.file.size)}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            {file.status === 'uploading' && (
                                <div className="flex items-center space-x-2">
                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${file.progress}%` }}
                                        />
                                    </div>
                                    <span className="text-sm text-gray-600 w-10 text-right">{file.progress}%</span>
                                </div>
                            )}
                            {file.status === 'success' && (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                            {file.status === 'error' && (
                                <div className="flex items-center space-x-2">
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                    <button
                                        onClick={() => onRetry(file.id)}
                                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}