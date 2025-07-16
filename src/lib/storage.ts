import { AppState, ProcessingJob, ProcessingResult } from './types'

const STORAGE_KEYS = {
    APP_STATE: 'modele-giydir-app-state',
    PROCESSING_HISTORY: 'modele-giydir-processing-history',
    RESULTS: 'modele-giydir-results',
    UPLOADED_IMAGES: 'modele-giydir-uploaded-images'
}

export function saveAppState(state: Partial<AppState>) {
    try {
        const existingState = getAppState()
        const newState = { ...existingState, ...state }
        localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(newState))
    } catch (error) {
        console.error('Failed to save app state:', error)
    }
}

export function getAppState(): AppState {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.APP_STATE)
        if (stored) {
            const parsed = JSON.parse(stored)
            return {
                currentStep: parsed.currentStep || 'upload',
                uploadedImages: parsed.uploadedImages || [],
                selectedModel: parsed.selectedModel,
                processingHistory: parsed.processingHistory || [],
                results: parsed.results || [],
                currentJob: parsed.currentJob
            }
        }
    } catch (error) {
        console.error('Failed to get app state:', error)
    }

    return {
        currentStep: 'upload',
        uploadedImages: [],
        processingHistory: [],
        results: []
    }
}

export function saveProcessingJob(job: ProcessingJob) {
    try {
        const history = getProcessingHistory()
        const existingIndex = history.findIndex(j => j.id === job.id)

        if (existingIndex >= 0) {
            history[existingIndex] = job
        } else {
            history.unshift(job)
        }

        localStorage.setItem(STORAGE_KEYS.PROCESSING_HISTORY, JSON.stringify(history))

        // Also update app state
        const appState = getAppState()
        appState.processingHistory = history
        if (appState.currentJob?.id === job.id) {
            appState.currentJob = job
        }
        localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(appState))
    } catch (error) {
        console.error('Failed to save processing job:', error)
    }
}

export function getProcessingHistory(): ProcessingJob[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.PROCESSING_HISTORY)
        return stored ? JSON.parse(stored) : []
    } catch (error) {
        console.error('Failed to get processing history:', error)
        return []
    }
}

export function saveResult(result: ProcessingResult) {
    try {
        const results = getResults()
        const existingIndex = results.findIndex(r => r.id === result.id)

        if (existingIndex >= 0) {
            results[existingIndex] = result
        } else {
            results.unshift(result)
        }

        localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results))

        // Also update app state
        const appState = getAppState()
        appState.results = results
        localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(appState))
    } catch (error) {
        console.error('Failed to save result:', error)
    }
}

export function getResults(): ProcessingResult[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.RESULTS)
        return stored ? JSON.parse(stored) : []
    } catch (error) {
        console.error('Failed to get results:', error)
        return []
    }
}

export function clearAllData() {
    try {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key)
        })
    } catch (error) {
        console.error('Failed to clear data:', error)
    }
}

export function exportData() {
    try {
        const data = {
            appState: getAppState(),
            processingHistory: getProcessingHistory(),
            results: getResults()
        }

        const dataStr = JSON.stringify(data, null, 2)
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

        const exportFileDefaultName = `modele-giydir-data-${new Date().toISOString().split('T')[0]}.json`

        const linkElement = document.createElement('a')
        linkElement.setAttribute('href', dataUri)
        linkElement.setAttribute('download', exportFileDefaultName)
        linkElement.click()
    } catch (error) {
        console.error('Failed to export data:', error)
    }
} 