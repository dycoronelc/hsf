/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_BUILD_ID:
      process.env.NEXT_PUBLIC_BUILD_ID ||
      process.env.RAILWAY_GIT_COMMIT_SHA ||
      process.env.RAILWAY_DEPLOYMENT_ID ||
      '',
  },
  async headers() {
    return [
      {
        source: '/logo-blanco.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
    ]
  },
  // /api/* se reenvía al backend en runtime vía app/api/[...path]/route.ts (lee API_URL al ejecutar).
}

module.exports = nextConfig
