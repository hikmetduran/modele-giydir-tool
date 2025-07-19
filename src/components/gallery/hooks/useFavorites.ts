import { useState, useEffect } from 'react'

export function useFavorites() {
    const [favorites, setFavorites] = useState<Set<string>>(new Set())

    // Load favorites from localStorage
    const loadFavorites = () => {
        try {
            const stored = localStorage.getItem('tryon-favorites')
            if (stored) {
                setFavorites(new Set(JSON.parse(stored)))
            }
        } catch (error) {
            console.error('Failed to load favorites:', error)
        }
    }

    // Save favorites to localStorage
    const saveFavorites = (newFavorites: Set<string>) => {
        try {
            localStorage.setItem('tryon-favorites', JSON.stringify([...newFavorites]))
        } catch (error) {
            console.error('Failed to save favorites:', error)
        }
    }

    // Handle favorites
    const toggleFavorite = (id: string) => {
        const newFavorites = new Set(favorites)
        if (newFavorites.has(id)) {
            newFavorites.delete(id)
        } else {
            newFavorites.add(id)
        }
        setFavorites(newFavorites)
        saveFavorites(newFavorites)
    }

    // Load on mount
    useEffect(() => {
        loadFavorites()
    }, [])

    return {
        favorites,
        toggleFavorite,
        saveFavorites
    }
}
