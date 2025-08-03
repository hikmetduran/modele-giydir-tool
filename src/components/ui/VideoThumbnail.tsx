'use client'

import { useState, useRef } from 'react'
import { Play, Pause, Download, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoThumbnailProps {
    videoUrl: string
    className?: string
    onDownload?: () => void
    autoPlay?: boolean // New prop to control auto-play behavior
}

export default function VideoThumbnail({
    videoUrl,
    className,
    onDownload,
    autoPlay = false
}: VideoThumbnailProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [showControls, setShowControls] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)

    const handlePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause()
            } else {
                videoRef.current.play()
            }
            setIsPlaying(!isPlaying)
        }
    }

    const handleVideoClick = () => {
        if (!isExpanded) {
            setIsExpanded(true)
            // Auto-play when expanded
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.play()
                    setIsPlaying(true)
                }
            }, 100)
        } else {
            handlePlayPause()
        }
    }

    const handleToggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsExpanded(!isExpanded)
        if (!isExpanded) {
            // Auto-play when expanding
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.play()
                    setIsPlaying(true)
                }
            }, 100)
        } else {
            // Pause when collapsing
            if (videoRef.current) {
                videoRef.current.pause()
                setIsPlaying(false)
            }
        }
    }

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (onDownload) {
            onDownload()
        } else {
            // Fallback download
            const link = document.createElement('a')
            link.href = videoUrl
            link.download = 'try-on-video.mp4'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }
    }

    if (!isExpanded) {
        // Thumbnail view - auto-play if enabled, otherwise show play button
        return (
            <div
                className={cn(
                    'relative group rounded-lg overflow-hidden bg-gray-100',
                    autoPlay ? '' : 'cursor-pointer hover:shadow-lg',
                    'transition-all duration-200',
                    className
                )}
                onClick={autoPlay ? undefined : handleVideoClick}
            >
                {/* Video element */}
                <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                    autoPlay={autoPlay}
                    preload="metadata"
                    onLoadedData={() => {
                        if (autoPlay) {
                            // For auto-play, start playing immediately
                            if (videoRef.current) {
                                videoRef.current.play().catch(console.error)
                            }
                        } else {
                            // For thumbnail, seek to 1 second to get a good frame
                            if (videoRef.current) {
                                videoRef.current.currentTime = 1
                            }
                        }
                    }}
                    onError={(e) => {
                        console.error('Video thumbnail load error:', e)
                        console.error('Video URL:', videoUrl)
                    }}
                />

                {/* Play button overlay - only show if not auto-playing */}
                {!autoPlay && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                        <div className="bg-white/90 rounded-full p-3 group-hover:bg-white group-hover:scale-110 transition-all duration-200">
                            <Play className="h-6 w-6 text-gray-800 ml-0.5" />
                        </div>
                    </div>
                )}

                {/* Video indicator - only show if not auto-playing */}
                {!autoPlay && (
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        5s
                    </div>
                )}

                {/* Download button */}
                <button
                    onClick={handleDownload}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Download video"
                >
                    <Download className="h-4 w-4" />
                </button>
            </div>
        )
    }

    // Expanded video player view
    return (
        <div
            className={cn(
                'relative rounded-lg overflow-hidden bg-black',
                'shadow-xl border border-gray-200',
                className
            )}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-auto max-h-96 object-contain"
                loop
                muted
                playsInline
                onClick={handlePlayPause}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            />

            {/* Video controls overlay */}
            <div
                className={cn(
                    'absolute inset-0 flex items-center justify-center transition-opacity duration-200',
                    showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
                )}
            >
                {/* Play/Pause button */}
                <button
                    onClick={handlePlayPause}
                    className="bg-black/60 hover:bg-black/80 text-white rounded-full p-3 transition-colors"
                >
                    {isPlaying ? (
                        <Pause className="h-6 w-6" />
                    ) : (
                        <Play className="h-6 w-6 ml-0.5" />
                    )}
                </button>
            </div>

            {/* Top controls */}
            <div
                className={cn(
                    'absolute top-2 right-2 flex space-x-2 transition-opacity duration-200',
                    showControls ? 'opacity-100' : 'opacity-0'
                )}
            >
                <button
                    onClick={handleDownload}
                    className="bg-black/60 hover:bg-black/80 text-white p-1.5 rounded transition-colors"
                    title="Download video"
                >
                    <Download className="h-4 w-4" />
                </button>
                <button
                    onClick={handleToggleExpand}
                    className="bg-black/60 hover:bg-black/80 text-white p-1.5 rounded transition-colors"
                    title="Minimize video"
                >
                    <Minimize2 className="h-4 w-4" />
                </button>
            </div>

            {/* Bottom info */}
            <div
                className={cn(
                    'absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded transition-opacity duration-200',
                    showControls ? 'opacity-100' : 'opacity-0'
                )}
            >
                Try-on Video • 5s • Auto-loop
            </div>
        </div>
    )
}