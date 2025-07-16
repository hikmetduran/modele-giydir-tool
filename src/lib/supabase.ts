import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jgltcxeloicyvaenvanu.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnbHRjeGVsb2ljeXZhZW52YW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MzQ3MDQsImV4cCI6MjA2NzMxMDcwNH0.-Cq0rARxpB_MCqrhSwSl-g69Ia9RaFhjehU2uiMDyQA'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnbHRjeGVsb2ljeXZhZW52YW51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTczNDcwNCwiZXhwIjoyMDY3MzEwNzA0fQ.OE0qdCVtU5ZK7T27GcD_IccpVDgZF22uz0PRmG0dvmc'

// Validate environment variables
if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
}
if (!supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
}
if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
}

// Browser client for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server client for server-side operations
export const supabaseServer = createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

// Type definitions for our database
export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string
                    full_name: string | null
                    avatar_url: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    full_name?: string | null
                    avatar_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    full_name?: string | null
                    avatar_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            model_photos: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    image_url: string
                    image_path: string
                    gender: string
                    body_type: string | null
                    is_active: boolean
                    sort_order: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    image_url: string
                    image_path: string
                    gender?: string
                    body_type?: string | null
                    is_active?: boolean
                    sort_order?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    image_url?: string
                    image_path?: string
                    gender?: string
                    body_type?: string | null
                    is_active?: boolean
                    sort_order?: number
                    created_at?: string
                }
            }
            product_images: {
                Row: {
                    id: string
                    user_id: string
                    original_filename: string
                    image_url: string
                    image_path: string
                    file_size: number | null
                    mime_type: string | null
                    width: number | null
                    height: number | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    original_filename: string
                    image_url: string
                    image_path: string
                    file_size?: number | null
                    mime_type?: string | null
                    width?: number | null
                    height?: number | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    original_filename?: string
                    image_url?: string
                    image_path?: string
                    file_size?: number | null
                    mime_type?: string | null
                    width?: number | null
                    height?: number | null
                    created_at?: string
                }
            }
            try_on_results: {
                Row: {
                    id: string
                    user_id: string
                    product_image_id: string
                    model_photo_id: string
                    result_image_url: string | null
                    result_image_path: string | null
                    status: string
                    ai_provider: string | null
                    ai_model: string | null
                    processing_time_seconds: number | null
                    error_message: string | null
                    metadata: Record<string, unknown> | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    product_image_id: string
                    model_photo_id: string
                    result_image_url?: string | null
                    result_image_path?: string | null
                    status?: string
                    ai_provider?: string | null
                    ai_model?: string | null
                    processing_time_seconds?: number | null
                    error_message?: string | null
                    metadata?: Record<string, unknown> | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    product_image_id?: string
                    model_photo_id?: string
                    result_image_url?: string | null
                    result_image_path?: string | null
                    status?: string
                    ai_provider?: string | null
                    ai_model?: string | null
                    processing_time_seconds?: number | null
                    error_message?: string | null
                    metadata?: Record<string, unknown> | null
                    created_at?: string
                    updated_at?: string
                }
            }
            wallets: {
                Row: {
                    id: string
                    user_id: string
                    credits: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    credits?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    credits?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            credit_transactions: {
                Row: {
                    id: string
                    user_id: string
                    wallet_id: string
                    amount: number
                    transaction_type: string
                    description: string | null
                    try_on_result_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    wallet_id: string
                    amount: number
                    transaction_type: string
                    description?: string | null
                    try_on_result_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    wallet_id?: string
                    amount?: number
                    transaction_type?: string
                    description?: string | null
                    try_on_result_id?: string | null
                    created_at?: string
                }
            }
        }
    }
}

// Helper types for our application
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ModelPhoto = Database['public']['Tables']['model_photos']['Row']
export type ProductImage = Database['public']['Tables']['product_images']['Row']
export type TryOnResult = Database['public']['Tables']['try_on_results']['Row']
export type Wallet = Database['public']['Tables']['wallets']['Row']
export type CreditTransaction = Database['public']['Tables']['credit_transactions']['Row']

// Status types for try-on results
export type TryOnStatus = 'pending' | 'processing' | 'completed' | 'failed'

// Helper function to get authenticated user
export async function getAuthUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
}

// Helper function to get user profile
export async function getUserProfile(userId: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

    return { data, error }
}

// Wallet management functions
export async function getUserWallet(userId: string) {
    const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

    // If no wallet exists, create one
    if (!data && !error) {
        const { data: newWallet, error: createError } = await supabase
            .from('wallets')
            .insert({ user_id: userId, credits: 100 })
            .select()
            .single()

        return { data: newWallet, error: createError }
    }

    return { data, error }
}

export async function deductCredits(
    userId: string,
    amount: number,
    description: string = 'Try-on generation',
    tryOnResultId?: string
) {
    const { data, error } = await supabase.rpc('deduct_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_description: description,
        p_try_on_result_id: tryOnResultId
    })

    return { success: data, error }
}

export async function refundCredits(
    userId: string,
    amount: number,
    description: string = 'Try-on generation refund',
    tryOnResultId?: string
) {
    const { data, error } = await supabase.rpc('refund_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_description: description,
        p_try_on_result_id: tryOnResultId
    })

    return { success: data, error }
}

export async function getCreditTransactions(userId: string) {
    const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    return { data, error }
} 