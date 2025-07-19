import { functions } from './appwrite.js'

export async function processTryOnWithEdgeFunction(
    productImageId,
    modelPhotoId,
    jobId
) {
    try {
        console.log('🚀 Calling Appwrite function for try-on processing:', { productImageId, modelPhotoId, jobId })

        const { data, error } = await functions.createExecution(
            'processTryOn',
            JSON.stringify({
                productImageId,
                modelPhotoId,
                jobId
            })
        )

        if (error) {
            console.error('❌ Appwrite function error:', error)
            return {
                success: false,
                error: error.message || 'Appwrite function call failed'
            }
        }

        // Parse the response
        const response = JSON.parse(data.response)
        console.log('✅ Appwrite function response:', response)
        return response
    } catch (error) {
        console.error('❌ Appwrite function call failed:', error)
        return {
            success: false,
            error: error.message || 'Unknown error'
        }
    }
}
