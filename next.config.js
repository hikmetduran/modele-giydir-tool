/** @type {import('next').NextConfig} */
const nextConfig = {
    // Image optimization
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'jgltcxeloicyvaenvanu.supabase.co',
                port: '',
                pathname: '/storage/v1/object/public/**',
            },
            {
                protocol: 'https',
                hostname: 'cdn.fashn.ai',
                port: '',
                pathname: '/**',
            },
        ],
    },

    // Environment variables
    env: {
        NEXT_PUBLIC_FAL_KEY: process.env.NEXT_PUBLIC_FAL_KEY,
    },

    // Output configuration
    output: 'standalone',

    // Suppress Node.js version warning
    webpack: (config, { isServer }) => {
        // Suppress warnings about Node.js version
        config.infrastructureLogging = {
            level: 'error',
        }

        return config
    },
}

module.exports = nextConfig 