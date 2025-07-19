import { 
    ProductImage, 
    ProductImageInput, 
    TryOnResult, 
    TryOnResultInput, 
    ModelPhoto,
    Wallet,
    CreditTransaction,
    CreditTransactionInput,
    Gender
} from './database/types'
import { supabase } from './supabase'

// Product Images Operations
export async function getUserProductImages(userId: string): Promise<ProductImage[]> {
    try {
        const { data, error } = await supabase
            .from('product_images')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching user product images:', error)
        return []
    }
}

export async function createProductImage(input: ProductImageInput): Promise<ProductImage | null> {
    try {
        const { data, error } = await supabase
            .from('product_images')
            .insert(input)
            .select()
            .single()

        if (error) throw error
        return data
    } catch (error) {
        console.error('Error creating product image:', error)
        return null
    }
}

export async function deleteProductImage(id: string, userId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('product_images')
            .delete()
            .eq('id', id)
            .eq('user_id', userId)

        if (error) throw error
        return true
    } catch (error) {
        console.error('Error deleting product image:', error)
        return false
    }
}

// Try On Results Operations
export async function getUserTryOnResults(userId: string): Promise<TryOnResult[]> {
    try {
        const { data, error } = await supabase
            .from('try_on_results')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching user try-on results:', error)
        return []
    }
}

export async function createTryOnResult(input: TryOnResultInput): Promise<TryOnResult | null> {
    try {
        const { data, error } = await supabase
            .from('try_on_results')
            .insert(input)
            .select()
            .single()

        if (error) throw error
        return data
    } catch (error) {
        console.error('Error creating try-on result:', error)
        return null
    }
}

export async function updateTryOnResult(id: string, updates: Partial<TryOnResult>): Promise<TryOnResult | null> {
    try {
        const { data, error } = await supabase
            .from('try_on_results')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    } catch (error) {
        console.error('Error updating try-on result:', error)
        return null
    }
}

// Wallet Operations
export async function getUserWallet(userId: string): Promise<Wallet | null> {
    try {
        const { data, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                // Wallet doesn't exist, create it
                return await createUserWallet(userId)
            }
            throw error
        }
        return data
    } catch (error) {
        console.error('Error fetching user wallet:', error)
        return null
    }
}

export async function createUserWallet(userId: string): Promise<Wallet | null> {
    try {
        const { data, error } = await supabase
            .from('wallets')
            .insert({ user_id: userId, credits: 100 }) // Start with 100 credits
            .select()
            .single()

        if (error) throw error
        return data
    } catch (error) {
        console.error('Error creating user wallet:', error)
        return null
    }
}

export async function updateUserWallet(userId: string, updates: Partial<Wallet>): Promise<Wallet | null> {
    try {
        const { data, error } = await supabase
            .from('wallets')
            .update(updates)
            .eq('user_id', userId)
            .select()
            .single()

        if (error) throw error
        return data
    } catch (error) {
        console.error('Error updating user wallet:', error)
        return null
    }
}

// Credit Transactions Operations
export async function getUserCreditTransactions(userId: string): Promise<CreditTransaction[]> {
    try {
        const { data, error } = await supabase
            .from('credit_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching user credit transactions:', error)
        return []
    }
}

export async function createCreditTransaction(input: CreditTransactionInput): Promise<CreditTransaction | null> {
    try {
        const { data, error } = await supabase
            .from('credit_transactions')
            .insert(input)
            .select()
            .single()

        if (error) throw error
        return data
    } catch (error) {
        console.error('Error creating credit transaction:', error)
        return null
    }
}

// Model Photos Operations
export async function getAllModelPhotos(): Promise<ModelPhoto[]> {
    try {
        const { data, error } = await supabase
            .from('model_photos')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching model photos:', error)
        return []
    }
}

export async function getModelPhotoById(id: string): Promise<ModelPhoto | null> {
    try {
        const { data, error } = await supabase
            .from('model_photos')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        return data
    } catch (error) {
        console.error('Error fetching model photo by ID:', error)
        return null
    }
}

export async function getModelPhotosByGender(gender: Gender): Promise<ModelPhoto[]> {
    try {
        const { data, error } = await supabase
            .from('model_photos')
            .select('*')
            .eq('is_active', true)
            .eq('gender', gender)
            .order('sort_order', { ascending: true })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching model photos by gender:', error)
        return []
    }
}

// Utility function to get storage URL
export function getStorageUrl(bucket: string, path: string): string {
    const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(path)

    return data.publicUrl
}
