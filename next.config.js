/**
 * Optional sub-path deployment: NEXT_PUBLIC_BASE_PATH=/chatbot serves the whole
 * app from https://<host>/chatbot. Keep in sync with BASE_PATH in
 * config/index.ts — the value is inlined at build time, so changing it requires
 * a rebuild (`next start` alone will not pick it up). Leaving it empty keeps the
 * app on the domain root, which is the default.
 */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/+$/, '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: basePath || undefined,
  productionBrowserSourceMaps: false, // enable browser source map generation during the production build
  // Configure pageExtensions to include md and mdx
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  experimental: {
    // appDir: true,
  },
  // fix all before production. Now it slow the develop speed.
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // https://nextjs.org/docs/api-reference/next.config.js/ignoring-typescript-errors
    ignoreBuildErrors: true,
  },
  output: 'standalone',
}

module.exports = nextConfig
