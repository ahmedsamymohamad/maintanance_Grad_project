/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    '*.replit.dev',
    '*.repl.co',
    '*.riker.replit.dev',
    '*.kirk.replit.dev',
    '*.picard.replit.dev',
    '*.janeway.replit.dev',
    '*.spock.replit.dev',
    '*.worf.replit.dev',
    '*.app.github.dev',
    '*.githubpreview.dev',
  ],
  experimental: {
    serverActions: {
      allowedOrigins: ['*.app.github.dev', '*.githubpreview.dev', 'localhost:5000'],
    },
  },
}

export default nextConfig
