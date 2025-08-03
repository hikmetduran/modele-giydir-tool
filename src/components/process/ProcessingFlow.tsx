'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { Upload, Users, Sparkles, Download, ArrowRight, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { SelectableImage, ModelImage, ProcessingJob, AppState } from '@/lib/types'
import { GarmentType } from '@/lib/database/types/model_photos'
import { generateId } from '@/lib/utils'
import { saveAppState, getAppState } from '@/lib/storage'
import { useAuth } from '@/components/auth/AuthProvider'
import { processTryOnWithEdgeFunction, processVideoGenerationWithEdgeFunction, getVideoGenerationStatus } from '@/lib/edge-functions'
import { createTryOnResult, getTryOnResultStatus } from '@/lib/supabase-storage'
import { useWallet } from '@/lib/hooks/useWallet'
import FileUpload from '@/components/upload/FileUpload'
import ModelSelection from '@/components/model/ModelSelection'
import RegenerateButton from '@/components/ui/RegenerateButton'
import GenerateVideoButton from '@/components/ui/GenerateVideoButton'
import VideoThumbnail from '@/components/ui/VideoThumbnail'

interface ProcessingFlowProps {
    className?: string
}

export default function ProcessingFlow({ className }: ProcessingFlowProps) {
    const { user } = useAuth()
    const { wallet, refreshWallet } = useWallet()
    const [appState, setAppState] = useState<AppState>({
        currentStep: 'upload',
        uploadedImages: [],
        processingHistory: [],
        results: []
    })
    const [selectedGarmentType, setSelectedGarmentType] = useState<GarmentType>('tops')
    const [regeneratingJobs, setRegeneratingJobs] = useState<Set<string>>(new Set())
    const [generatingVideos, setGeneratingVideos] = useState<Set<string>>(new Set())
    const [jobVideoData, setJobVideoData] = useState<Map<string, { videoUrl?: string; videoStatus?: string }>>(new Map())

    // Removed unused isLoading state

    // Load state from localStorage on mount
    useEffect(() => {
        const savedState = getAppState()
        setAppState(savedState)
    }, [])

    // Save state to localStorage whenever it changes
    useEffect(() => {
        saveAppState(appState)
    }, [appState])

    const steps = [
        { id: 'upload', name: 'Upload Product', icon: Upload },
        { id: 'select', name: 'Select Model', icon: Users },
        { id: 'process', name: 'AI Processing', icon: Sparkles },
        { id: 'results', name: 'Download Results', icon: Download },
    ]

    const currentStepIndex = steps.findIndex(step => step.id === appState.currentStep)

    const handleUpload = useCallback((images: SelectableImage[]) => {
        setAppState(prev => ({
            ...prev,
            uploadedImages: images
        }))
    }, [])

    const handleModelSelect = useCallback((model: ModelImage, garmentType?: GarmentType) => {
        setAppState(prev => ({
            ...prev,
            selectedModel: model
        }))
        if (garmentType) {
            setSelectedGarmentType(garmentType)
        }
    }, [])

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            const nextStep = steps[currentStepIndex + 1]

            // Check credits before processing
            if (nextStep.id === 'process') {
                const requiredCredits = appState.uploadedImages.length * 10
                if (!wallet || wallet.credits < requiredCredits) {
                    alert(`Insufficient credits. You need ${requiredCredits} credits but only have ${wallet?.credits || 0}. Please contact support to add more credits.`)
                    return
                }
                console.log('💰 Starting processing with wallet balance:', wallet.credits)
                startProcessing()
            }

            setAppState(prev => ({
                ...prev,
                currentStep: nextStep.id as AppState['currentStep']
            }))
        }
    }

    const handlePrevious = () => {
        if (currentStepIndex > 0) {
            const prevStep = steps[currentStepIndex - 1]
            setAppState(prev => ({
                ...prev,
                currentStep: prevStep.id as AppState['currentStep']
            }))
        }
    }

    const startProcessing = async () => {
        if (!appState.uploadedImages.length || !appState.selectedModel) return

        // Create jobs for all uploaded images
        const jobs: ProcessingJob[] = appState.uploadedImages.map(image => ({
            id: generateId(),
            productImage: image,
            modelImage: appState.selectedModel!,
            status: 'pending',
            progress: 0,
            createdAt: new Date()
        }))

        setAppState(prev => ({
            ...prev,
            currentJobs: jobs,
            processingHistory: [...jobs, ...prev.processingHistory]
        }))

        try {
            // Process all images simultaneously
            await Promise.all(jobs.map(job => processWithAI(job)))
        } catch (error) {
            console.error('Processing failed:', error)
            // Handle error state
            refreshWallet() // Refresh wallet in case of processing error
        }
    }

    const processWithAI = async (job: ProcessingJob) => {
        if (!user) return

        try {
            console.log('🚀 Starting AI processing for job:', job.id)

            // Create a try-on result record in the database
            const createResult = await createTryOnResult(
                user.id,
                job.productImage.id,
                job.modelImage.id
            )

            if (!createResult.success || !createResult.data) {
                throw new Error(`Failed to create try-on result: ${createResult.error}`)
            }

            const jobId = createResult.data.id
            console.log('✅ Created try-on result record:', jobId)

            // Update job status to processing
            const updateJob = (updates: Partial<ProcessingJob>) => {
                setAppState(prev => ({
                    ...prev,
                    currentJobs: prev.currentJobs?.map(j => j.id === job.id ? { ...j, ...updates } : j),
                    processingHistory: prev.processingHistory.map(h => h.id === job.id ? { ...h, ...updates } : h)
                }))
            }

            updateJob({
                progress: 10,
                status: 'processing',
                dbId: jobId // Store the database ID
            })

            // Call edge function to process the try-on request
            const result = await processTryOnWithEdgeFunction(
                job.productImage.id,
                job.modelImage.id,
                jobId,
                selectedGarmentType
            )

            if (result.success) {
                console.log('✅ Edge function processing started successfully')

                // Poll for completion by checking the database
                await pollForCompletion(jobId, job.id, updateJob)
            } else {
                console.error('❌ Edge function processing failed:', result.error)
                updateJob({
                    progress: 0,
                    status: 'failed',
                    completedAt: new Date(),
                    error: result.error
                })
                // Refresh wallet to ensure balance is up to date (refund should have occurred)
                refreshWallet()
            }
        } catch (error) {
            console.error('❌ Processing error:', error)

            const updateJob = (updates: Partial<ProcessingJob>) => {
                setAppState(prev => ({
                    ...prev,
                    currentJobs: prev.currentJobs?.map(j => j.id === job.id ? { ...j, ...updates } : j),
                    processingHistory: prev.processingHistory.map(h => h.id === job.id ? { ...h, ...updates } : h)
                }))
            }

            updateJob({
                progress: 0,
                status: 'failed',
                completedAt: new Date(),
                error: error instanceof Error ? error.message : 'Unknown error'
            })
            // Refresh wallet to ensure balance is up to date (refund should have occurred)
            refreshWallet()
        }

        // Check if all jobs are completed
        setAppState(prev => {
            const allCompleted = prev.currentJobs?.every(j => j.status === 'completed' || j.status === 'failed')
            if (allCompleted) {
                // Refresh wallet to ensure balance is up to date
                refreshWallet()

                setTimeout(() => {
                    setAppState(prevState => ({
                        ...prevState,
                        currentStep: 'results'
                    }))
                }, 1500) // Wait 1.5 seconds to show completion, then auto-advance
            }
            return prev
        })
    }

    const pollForCompletion = async (
        jobId: string,
        processingJobId: string,
        updateJob: (updates: Partial<ProcessingJob>) => void
    ) => {
        if (!user) return

        let attempts = 0
        const maxAttempts = 120 // 10 minutes max (5 second intervals)

        while (attempts < maxAttempts) {
            try {
                const statusResult = await getTryOnResultStatus(jobId, user.id)

                if (statusResult.success && statusResult.data) {
                    const { status, result_image_url, error_message } = statusResult.data

                    if (status === 'completed') {
                        console.log('✅ Processing completed successfully')
                        updateJob({
                            progress: 100,
                            status: 'completed',
                            completedAt: new Date(),
                            resultUrl: result_image_url as string
                        })
                        // Refresh wallet and trigger global event for Header update
                        refreshWallet()
                        window.dispatchEvent(new CustomEvent('walletUpdated'))
                        
                        // Add a delayed refresh as backup
                        setTimeout(() => {
                            refreshWallet()
                            window.dispatchEvent(new CustomEvent('walletUpdated'))
                        }, 2000)
                        return
                    } else if (status === 'failed') {
                        console.error('❌ Processing failed:', error_message)
                        updateJob({
                            progress: 0,
                            status: 'failed',
                            completedAt: new Date(),
                            error: (error_message as string) || 'Processing failed'
                        })
                        // Refresh wallet to ensure balance is up to date (refund should have occurred)
                        refreshWallet()
                        return
                    } else if (status === 'processing') {
                        // Update progress based on processing status
                        const progress = Math.min(90, 20 + (attempts * 2)) // Gradual progress increase
                        updateJob({
                            progress,
                            status: 'processing'
                        })
                    }
                }
            } catch (error) {
                console.error('❌ Error polling for completion:', error)
            }

            attempts++
            await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
        }

        // Timeout
        console.error('❌ Processing timed out')
        updateJob({
            progress: 0,
            status: 'failed',
            completedAt: new Date(),
            error: 'Processing timed out'
        })
        // Refresh wallet to ensure balance is up to date (refund should have occurred)
        refreshWallet()
    }

    const downloadImage = async (url: string, filename: string) => {
        try {
            // For external URLs, we need to fetch and create a blob
            const response = await fetch(url)
            const blob = await response.blob()

            // Create object URL from blob
            const objectUrl = URL.createObjectURL(blob)

            // Create download link
            const link = document.createElement('a')
            link.href = objectUrl
            link.download = filename
            document.body.appendChild(link)
            link.click()

            // Cleanup
            document.body.removeChild(link)
            URL.revokeObjectURL(objectUrl)
        } catch (error) {
            console.error('Download failed:', error)
            // Fallback: open in new tab
            window.open(url, '_blank')
        }
    }

    const downloadAllResults = async () => {
        if (!appState.currentJobs) return

        const completedJobs = appState.currentJobs.filter(job => job.status === 'completed' && job.resultUrl)

        for (let i = 0; i < completedJobs.length; i++) {
            const job = completedJobs[i]
            if (job.resultUrl) {
                await downloadImage(job.resultUrl, `try-on-result-${i + 1}.png`)
                // Add small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 500))
            }
        }
    }

    const canProceed = () => {
        switch (appState.currentStep) {
            case 'upload':
                return appState.uploadedImages.length > 0
            case 'select':
                const requiredCredits = appState.uploadedImages.length * 10
                return appState.selectedModel !== undefined && wallet && wallet.credits >= requiredCredits
            case 'process':
                return appState.currentJobs?.every(job => job.status === 'completed' || job.status === 'failed') ?? false
            default:
                return false
        }
    }

    const resetFlow = () => {
        setAppState({
            currentStep: 'upload',
            uploadedImages: [],
            processingHistory: [],
            results: []
        })
    }

    // Handle regeneration of individual results
    const handleRegenerateResult = async (jobId: string) => {
        if (!user || !wallet || wallet.credits < 5) {
            alert('Insufficient credits. You need 5 credits to regenerate a result.')
            return
        }

        const job = appState.currentJobs?.find(j => j.id === jobId)
        if (!job || job.status !== 'completed' || !job.resultUrl) {
            alert('Cannot regenerate this result.')
            return
        }

        try {
            setRegeneratingJobs(prev => new Set([...prev, jobId]))

            // Create a new processing job for regeneration
            const newJobId = generateId()
            const regenerationJob: ProcessingJob = {
                id: newJobId,
                productImage: job.productImage,
                modelImage: job.modelImage,
                status: 'pending',
                progress: 0,
                createdAt: new Date()
            }

            // Add the regeneration job to current jobs
            setAppState(prev => ({
                ...prev,
                currentJobs: prev.currentJobs ? [...prev.currentJobs, regenerationJob] : [regenerationJob]
            }))

            // Create try-on result record
            const createResult = await createTryOnResult(
                user.id,
                job.productImage.id,
                job.modelImage.id
            )

            if (!createResult.success || !createResult.data) {
                throw new Error(`Failed to create regeneration result: ${createResult.error}`)
            }

            const dbJobId = createResult.data.id
            console.log('✅ Created regeneration result record:', dbJobId)

            // Process the regeneration
            await processRegenerationWithAI(regenerationJob, dbJobId, true)

        } catch (error) {
            console.error('Regeneration failed:', error)
            alert(error instanceof Error ? error.message : 'Regeneration failed')
            
            // Remove the failed regeneration job
            setAppState(prev => ({
                ...prev,
                currentJobs: prev.currentJobs?.filter(j => j.id !== jobId)
            }))
        } finally {
            setRegeneratingJobs(prev => {
                const newSet = new Set(prev)
                newSet.delete(jobId)
                return newSet
            })
        }
    }

    // Process regeneration with AI (similar to processWithAI but for regeneration)
    const processRegenerationWithAI = async (job: ProcessingJob, dbJobId: string, isRegeneration: boolean = false) => {
        if (!user) return

        try {
            console.log('🔄 Starting regeneration processing for job:', job.id)

            // Update job status to processing
            const updateJob = (updates: Partial<ProcessingJob>) => {
                setAppState(prev => ({
                    ...prev,
                    currentJobs: prev.currentJobs?.map(j => j.id === job.id ? { ...j, ...updates } : j)
                }))
            }

            updateJob({
                progress: 10,
                status: 'processing',
                dbId: dbJobId // Store the database ID for regeneration
            })

            // Call edge function to process the regeneration
            const result = await processTryOnWithEdgeFunction(
                job.productImage.id,
                job.modelImage.id,
                dbJobId,
                selectedGarmentType,
                isRegeneration
            )

            if (result.success) {
                console.log('✅ Regeneration edge function processing started successfully')

                // Poll for completion
                await pollForRegenerationCompletion(dbJobId, job.id, updateJob)
            } else {
                console.error('❌ Regeneration edge function processing failed:', result.error)
                updateJob({
                    progress: 0,
                    status: 'failed',
                    completedAt: new Date(),
                    error: result.error
                })
                refreshWallet()
            }
        } catch (error) {
            console.error('❌ Regeneration processing error:', error)

            const updateJob = (updates: Partial<ProcessingJob>) => {
                setAppState(prev => ({
                    ...prev,
                    currentJobs: prev.currentJobs?.map(j => j.id === job.id ? { ...j, ...updates } : j)
                }))
            }

            updateJob({
                progress: 0,
                status: 'failed',
                completedAt: new Date(),
                error: error instanceof Error ? error.message : 'Unknown error'
            })
            refreshWallet()
        }
    }

    // Poll for regeneration completion
    const pollForRegenerationCompletion = async (
        jobId: string,
        processingJobId: string,
        updateJob: (updates: Partial<ProcessingJob>) => void
    ) => {
        if (!user) return

        let attempts = 0
        const maxAttempts = 120 // 10 minutes max

        while (attempts < maxAttempts) {
            try {
                const statusResult = await getTryOnResultStatus(jobId, user.id)

                if (statusResult.success && statusResult.data) {
                    const { status, result_image_url, error_message } = statusResult.data

                    if (status === 'completed') {
                        console.log('✅ Regeneration completed successfully')
                        updateJob({
                            progress: 100,
                            status: 'completed',
                            completedAt: new Date(),
                            resultUrl: result_image_url as string
                        })
                        // Refresh wallet and trigger global event for Header update
                        refreshWallet()
                        window.dispatchEvent(new CustomEvent('walletUpdated'))
                        
                        // Add a delayed refresh as backup
                        setTimeout(() => {
                            refreshWallet()
                            window.dispatchEvent(new CustomEvent('walletUpdated'))
                        }, 2000)
                        return
                    } else if (status === 'failed') {
                        console.error('❌ Regeneration failed:', error_message)
                        updateJob({
                            progress: 0,
                            status: 'failed',
                            completedAt: new Date(),
                            error: (error_message as string) || 'Regeneration failed'
                        })
                        refreshWallet()
                        return
                    } else if (status === 'processing') {
                        const progress = Math.min(90, 20 + (attempts * 2))
                        updateJob({
                            progress,
                            status: 'processing'
                        })
                    }
                }
            } catch (error) {
                console.error('❌ Error polling for regeneration completion:', error)
            }

            attempts++
            await new Promise(resolve => setTimeout(resolve, 5000))
        }

        // Timeout
        console.error('❌ Regeneration timed out')
        updateJob({
            progress: 0,
            status: 'failed',
            completedAt: new Date(),
            error: 'Regeneration timed out'
        })
        refreshWallet()
    }

    // Video generation functions
    const handleGenerateVideo = async (jobId: string) => {
        if (!user || !wallet || wallet.credits < 50) {
            alert('Insufficient credits. You need 50 credits to generate a video.')
            return
        }

        const job = appState.currentJobs?.find(j => j.id === jobId)
        if (!job || job.status !== 'completed' || !job.resultUrl) {
            alert('Cannot generate video for this result.')
            return
        }

        try {
            setGeneratingVideos(prev => new Set([...prev, jobId]))

            // Use the stored database ID for video generation
            if (!job.dbId) {
                alert('Cannot generate video: Database ID not found for this result.')
                return
            }
            
            const result = await processVideoGenerationWithEdgeFunction(job.dbId)

            if (result.success) {
                console.log('✅ Video generation started successfully')
                // Poll for video completion using database ID
                await pollForVideoCompletion(job.dbId)
            } else {
                console.error('❌ Video generation failed:', result.error)
                alert(result.error || 'Video generation failed')
            }
        } catch (error) {
            console.error('Video generation failed:', error)
            alert(error instanceof Error ? error.message : 'Video generation failed')
        } finally {
            setGeneratingVideos(prev => {
                const newSet = new Set(prev)
                newSet.delete(jobId)
                return newSet
            })
        }
    }

    // Poll for video generation completion
    const pollForVideoCompletion = async (tryOnResultId: string) => {
        if (!user) return

        let attempts = 0
        const maxAttempts = 240 // 20 minutes max (5 second intervals)

        while (attempts < maxAttempts) {
            try {
                const statusResult = await getVideoGenerationStatus(tryOnResultId, user.id)

                if (statusResult.success && statusResult.data) {
                    const { video_status, video_url, video_error_message } = statusResult.data

                    if (video_status === 'completed' && video_url) {
                        console.log('✅ Video generation completed successfully')
                        setJobVideoData(prev => new Map(prev.set(tryOnResultId, {
                            videoUrl: video_url as string,
                            videoStatus: 'completed'
                        })))
                        // Refresh wallet and trigger global event for Header update
                        refreshWallet()
                        window.dispatchEvent(new CustomEvent('walletUpdated'))
                        return
                    } else if (video_status === 'failed') {
                        console.error('❌ Video generation failed:', video_error_message)
                        setJobVideoData(prev => new Map(prev.set(tryOnResultId, {
                            videoStatus: 'failed'
                        })))
                        alert(video_error_message as string || 'Video generation failed')
                        return
                    } else if (video_status === 'processing') {
                        setJobVideoData(prev => new Map(prev.set(tryOnResultId, {
                            videoStatus: 'processing'
                        })))
                    }
                }
            } catch (error) {
                console.error('❌ Error polling for video completion:', error)
            }

            attempts++
            await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
        }

        // Timeout
        console.error('❌ Video generation timed out')
        setJobVideoData(prev => new Map(prev.set(tryOnResultId, {
            videoStatus: 'failed'
        })))
        alert('Video generation timed out')
    }

    const downloadVideo = async (url: string, filename: string) => {
        try {
            // For external URLs, we need to fetch and create a blob
            const response = await fetch(url)
            const blob = await response.blob()

            // Create object URL from blob
            const objectUrl = URL.createObjectURL(blob)

            // Create download link
            const link = document.createElement('a')
            link.href = objectUrl
            link.download = filename
            document.body.appendChild(link)
            link.click()

            // Cleanup
            document.body.removeChild(link)
            URL.revokeObjectURL(objectUrl)
        } catch (error) {
            console.error('Video download failed:', error)
            // Fallback: open in new tab
            window.open(url, '_blank')
        }
    }

    // Calculate overall progress for multiple jobs
    const getOverallProgress = () => {
        if (!appState.currentJobs || appState.currentJobs.length === 0) return 0
        const totalProgress = appState.currentJobs.reduce((sum, job) => sum + job.progress, 0)
        return Math.round(totalProgress / appState.currentJobs.length)
    }

    return (
        <div className={cn('max-w-6xl mx-auto', className)}>
            {/* Header */}
            {/* <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                    AI Try-On Tool
                </h1>
            </div> */}

            {/* Main Content Area */}
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
                {/* Progress Steps */}
                <div className="mb-12">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <Fragment key={step.id}>
                                <div className="flex flex-col items-center text-center w-24">
                                    <div className={cn(
                                        'flex items-center justify-center w-12 h-12 rounded-full border-2 transition-colors',
                                        index <= currentStepIndex
                                            ? 'bg-purple-600 border-purple-600 text-white'
                                            : 'bg-white border-gray-300 text-gray-400'
                                    )}>
                                        <step.icon className="w-6 h-6" />
                                    </div>
                                    <p className={cn(
                                        'text-sm font-medium mt-2 h-10 flex items-center', // h-10 to ensure consistent height
                                        index <= currentStepIndex ? 'text-purple-600' : 'text-gray-500'
                                    )}>
                                        {step.name}
                                    </p>
                                </div>

                                {index < steps.length - 1 && (
                                    <div className={cn(
                                        'flex-1 h-0.5',
                                        index < currentStepIndex ? 'bg-purple-600' : 'bg-gray-200'
                                    )}></div>
                                )}
                            </Fragment>
                        ))}
                    </div>
                </div>
                {/* Upload Step */}
                {appState.currentStep === 'upload' && (
                    <FileUpload onUpload={handleUpload} maxFiles={50} />
                )}

                {/* Model Selection Step */}
                {appState.currentStep === 'select' && (
                    <ModelSelection
                        onSelect={handleModelSelect}
                        selectedModel={appState.selectedModel}
                    />
                )}

                {/* Processing Step */}
                {appState.currentStep === 'process' && (
                    <div className="text-center">
                        <Sparkles className="mx-auto h-16 w-16 text-purple-600 mb-4" />
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">AI Processing</h2>
                        <p className="text-gray-600 mb-6">
                            Our AI is generating try-on images for your {appState.uploadedImages.length} product{appState.uploadedImages.length !== 1 ? 's' : ''}...
                        </p>

                        {appState.currentJobs && (
                            <div className="max-w-md mx-auto mb-8">
                                <div className="bg-gray-200 rounded-full h-3 mb-4">
                                    <div
                                        className="bg-purple-600 h-3 rounded-full transition-all duration-500"
                                        style={{ width: `${getOverallProgress()}%` }}
                                    ></div>
                                </div>
                                <p className="text-sm text-gray-500 mb-2">
                                    {getOverallProgress()}% complete
                                </p>
                                <p className="text-sm text-gray-600">
                                    Processing {appState.currentJobs.filter(j => j.status === 'completed').length} of {appState.currentJobs.length} images
                                </p>
                            </div>
                        )}

                        {/* Individual job progress */}
                        {appState.currentJobs && appState.currentJobs.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                                {appState.currentJobs.map((job, index) => (
                                    <div key={job.id} className="bg-gray-50 rounded-lg p-4">
                                        <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden mb-3 relative">
                                            <Image
                                                src={job.productImage.preview}
                                                alt={`Product ${index + 1}`}
                                                fill
                                                className="object-cover"
                                            />
                                            {job.status === 'processing' && (
                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                    <Sparkles className="h-16 w-16 text-white/80" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-gray-200 rounded-full h-2 mb-2">
                                            <div
                                                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${job.progress}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {job.status === 'completed' ? 'Complete!' : `${job.progress}%`}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Results Step */}
                {appState.currentStep === 'results' && (
                    <div>
                        <div className="text-center mb-8">
                            <Download className="mx-auto h-16 w-16 text-purple-600 mb-4" />
                            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your Results</h2>
                            <p className="text-gray-600 mb-6">
                                Here&apos;s how your products look on the selected model
                            </p>

                            <div className="flex justify-center space-x-4 mb-8">
                                <button
                                    onClick={downloadAllResults}
                                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                                >
                                    <Download className="h-4 w-4" />
                                    <span>Download All Results</span>
                                </button>

                                <a
                                    href="/gallery"
                                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                                >
                                    <ArrowRight className="h-4 w-4" />
                                    <span>View Gallery</span>
                                </a>

                                <button
                                    onClick={resetFlow}
                                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Try More Products
                                </button>
                            </div>
                        </div>

                        {appState.currentJobs && (
                            <div className="flex flex-col items-center space-y-8">
                                {appState.currentJobs.filter(job => job.status === 'completed').map((job) => {
                                    const videoData = jobVideoData.get(job.dbId || job.id)
                                    const hasVideo = videoData?.videoUrl
                                    const isGeneratingVideo = generatingVideos.has(job.id)
                                    const videoStatus = videoData?.videoStatus

                                    return (
                                        <div key={job.id} className="w-full max-w-5xl">
                                            {/* Main result display */}
                                            <div className="flex items-center justify-center space-x-4 md:space-x-8 mb-6">
                                                {/* Original Image */}
                                                <div className="w-1/4">
                                                    <div
                                                        className="relative aspect-[3/4] bg-gray-200 rounded-xl overflow-hidden cursor-pointer group shadow-md hover:shadow-xl transition-shadow"
                                                        onClick={() => downloadImage(job.productImage.preview, `original-${job.id}.jpg`)}
                                                    >
                                                        <Image
                                                            src={job.productImage.preview}
                                                            alt="Original product"
                                                            fill
                                                            className="object-cover"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60">
                                                            <Download className="h-8 w-8 text-white" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Arrow Icon */}
                                                <div className="flex-shrink-0">
                                                    <ArrowRight className="h-8 w-8 text-gray-400" />
                                                </div>

                                                {/* Try-On Result Image */}
                                                <div className="w-1/4">
                                                    <div
                                                        className="relative aspect-[3/4] bg-gray-200 rounded-xl overflow-hidden cursor-pointer group shadow-md hover:shadow-xl transition-shadow"
                                                        onClick={() => job.resultUrl && downloadImage(job.resultUrl, `try-on-result-${job.id}.png`)}
                                                    >
                                                        {job.resultUrl ? (
                                                            <>
                                                                <Image
                                                                    src={job.resultUrl}
                                                                    alt="Try-on result"
                                                                    fill
                                                                    className="object-cover"
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60">
                                                                    <Download className="h-8 w-8 text-white" />
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Users className="h-12 w-12 text-gray-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Video Section */}
                                                {hasVideo && (
                                                    <>
                                                        <div className="flex-shrink-0">
                                                            <ArrowRight className="h-8 w-8 text-gray-400" />
                                                        </div>
                                                        <div className="w-1/4">
                                                            <VideoThumbnail
                                                                videoUrl={videoData.videoUrl!}
                                                                className="aspect-[3/4] shadow-md hover:shadow-xl transition-shadow"
                                                                onDownload={() => downloadVideo(videoData.videoUrl!, `try-on-video-${job.id}.mp4`)}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex justify-center space-x-4">
                                                {/* Regenerate Button */}
                                                <RegenerateButton
                                                    onRegenerate={() => handleRegenerateResult(job.id)}
                                                    disabled={!wallet || wallet.credits < 5}
                                                    loading={regeneratingJobs.has(job.id)}
                                                    size="sm"
                                                />

                                                {/* Generate Video Button - only show if no video exists */}
                                                {!hasVideo && (
                                                    <GenerateVideoButton
                                                        onGenerateVideo={() => handleGenerateVideo(job.id)}
                                                        disabled={!wallet || wallet.credits < 50}
                                                        loading={isGeneratingVideo || videoStatus === 'processing'}
                                                        hasVideo={false}
                                                        size="sm"
                                                    />
                                                )}
                                            </div>

                                            {/* Video generation status */}
                                            {videoStatus === 'processing' && (
                                                <div className="mt-4 text-center">
                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                        <div className="text-blue-800 text-sm font-medium">🎬 Generating Video...</div>
                                                        <div className="text-blue-600 text-xs mt-1">
                                                            This may take a few minutes. You can continue using the app.
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {videoStatus === 'failed' && (
                                                <div className="mt-4 text-center">
                                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                                        <div className="text-red-800 text-sm font-medium">❌ Video Generation Failed</div>
                                                        <div className="text-red-600 text-xs mt-1">
                                                            Please try again or contact support if the issue persists.
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center">
                <button
                    onClick={handlePrevious}
                    disabled={currentStepIndex === 0}
                    className={cn(
                        'flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors',
                        currentStepIndex === 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    )}
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Previous</span>
                </button>

                {/* Credits Info */}
                {appState.currentStep === 'select' && appState.uploadedImages.length > 0 && (
                    <div className="text-sm text-gray-600 text-center">
                        <div className="font-medium">Generation Cost</div>
                        <div className={cn(
                            'font-semibold',
                            wallet && wallet.credits >= appState.uploadedImages.length * 10
                                ? 'text-green-600'
                                : 'text-red-600'
                        )}>
                            {appState.uploadedImages.length * 10} credits
                        </div>
                        <div className="text-xs text-gray-500">
                            You have {wallet?.credits || 0} credits
                        </div>
                        <div className="text-xs text-purple-600 mt-1">
                            💡 Regeneration costs only 5 credits per result
                        </div>
                        {wallet && wallet.credits < appState.uploadedImages.length * 10 && (
                            <div className="text-xs text-red-600 mt-1">
                                Insufficient credits
                            </div>
                        )}
                    </div>
                )}

                {/* Credits Info for Results Step */}
                {appState.currentStep === 'results' && appState.currentJobs && (
                    <div className="text-sm text-gray-600 text-center">
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                            <div className="font-medium text-purple-800">💡 Pro Tips</div>
                            <div className="text-xs text-purple-700 mt-1">
                                • Regenerate results for only 5 credits instead of 10!
                            </div>
                            <div className="text-xs text-purple-700">
                                • Generate 5-second videos for 50 credits each
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                                You have {wallet?.credits || 0} credits remaining
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={handleNext}
                    disabled={!canProceed() || currentStepIndex === steps.length - 1}
                    className={cn(
                        'flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors',
                        !canProceed() || currentStepIndex === steps.length - 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                    )}
                >
                    <span>Next</span>
                    <ArrowRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
} 