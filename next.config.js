/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8000',
  },
  async rewrites() {
    // API_URL se lee en runtime al iniciar el servidor (Railway)
    // NEXT_PUBLIC_API_URL puede estar vacío si se estableció después del build
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl.replace(/\/$/, '')}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
