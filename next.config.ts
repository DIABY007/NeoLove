import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Inclure le dossier data/ dans les fonctions serverless Vercel
  outputFileTracingIncludes: {
    '/api/**/*': ['./data/**/*'],
  },
}

export default nextConfig

