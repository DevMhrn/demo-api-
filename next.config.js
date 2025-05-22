/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure CSV files are included in serverless functions
  experimental: {
    outputFileTracingIncludes: {
      '/': ['./public/*.csv']
    }
  }
}

module.exports = nextConfig
