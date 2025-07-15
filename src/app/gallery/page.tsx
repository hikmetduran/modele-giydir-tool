import { Metadata } from 'next'
import ResultsGallery from '@/components/gallery/ResultsGallery'

export const metadata: Metadata = {
    title: 'Results Gallery | AI Try-On Studio',
    description: 'View all your AI try-on results in one place. Search, filter, and download your favorite generations.',
}

export default function GalleryPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                <ResultsGallery />
            </div>
        </div>
    )
} 