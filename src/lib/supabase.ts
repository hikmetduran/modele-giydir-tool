import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
}
if (!supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
}

// Browser client for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server client for server-side operations - only create when needed
export function createServerClient() {
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseServiceKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
    }
    
    if (!supabaseUrl) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
    }
    
    return createClient(
        supabaseUrl,
        supabaseServiceKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}

// Legacy export for backward compatibility - use createServerClient() instead
export const supabaseServer = typeof window === 'undefined' ? createServerClient() : null

// Type definitions for our database
export type Database = {
    public: {
        Tables: {
            model_photos: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    image_url: string
                    image_path: string
                    gender: string
                    body_type: string | null
                    garment_types: string[]
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
                    garment_types: string[]
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
                    garment_types?: string[]
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
                    type: string
                    description: string | null
                    try_on_result_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    wallet_id: string
                    amount: number
                    type: string
                    description?: string | null
                    try_on_result_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    wallet_id?: string
                    amount?: number
                    type?: string
                    description?: string | null
                    try_on_result_id?: string | null
                    created_at?: string
                }
            }
        }
    }
}

// Helper types for our application
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
