import type { NextConfig } from 'next'

// Optional bundle analyzer - only used when ANALYZE=true
let withBundleAnalyzer = (config: NextConfig) => config
if (process.env.ANALYZE === 'true') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bundleAnalyzer = require('@next/bundle-analyzer')
    withBundleAnalyzer = bundleAnalyzer({ enabled: true })
  } catch {
    console.warn(
      'Bundle analyzer not available - install @next/bundle-analyzer to use ANALYZE=true'
    )
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,

  /**
   * Output Configuration for Docker
   *
   * 'standalone' mode creates a minimal production build with only required dependencies
   * This significantly reduces Docker image size
   * @see https://nextjs.org/docs/app/api-reference/next-config-js/output
   */
  output: 'standalone',

  /**
   * Security Headers
   *
   * Implements security best practices to protect against common vulnerabilities
   * Admin UI has stricter CSP than tenant UI
   * @see https://nextjs.org/docs/app/api-reference/next-config-js/headers
   */
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          // Prevent clickjacking attacks
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Control which features and APIs can be used
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Content Security Policy - Stricter for Admin UI
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval and unsafe-inline
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Tailwind + Google Fonts
              "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com", // Google Fonts stylesheets
              "img-src 'self' data: https:",
              "font-src 'self' data: https://fonts.gstatic.com", // Google Fonts files
              "connect-src 'self'", // API calls through /api/proxy (same-origin)
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
  // Allow cross-origin requests in development (all origins)
  allowedDevOrigins: ['*'],
}

export default withBundleAnalyzer(nextConfig)
