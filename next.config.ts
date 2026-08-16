import type { NextConfig } from 'next'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true'
const isUserOrOrgSite = repoName.endsWith('.github.io')
const basePath = isGitHubPages && repoName && !isUserOrOrgSite ? `/${repoName}` : ''

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  images: { unoptimized: true },
}

export default nextConfig
