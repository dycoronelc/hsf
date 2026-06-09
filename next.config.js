/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8000',
  },
  // /api/* se reenvía al backend en runtime vía app/api/[...path]/route.ts (lee API_URL al ejecutar).
  // Los rewrites de next.config se evalúan solo en build y en Railway quedaban en localhost:8000.
}

module.exports = nextConfig
