import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	reactStrictMode: true,
	trailingSlash: true,

	images: {
		unoptimized: true,
		domains: [],
	},

	eslint: {
		ignoreDuringBuilds: true,
	},

	pageExtensions: ['ts', 'tsx', 'mdx'],

	webpack: (config, { isServer }) => {
		if (!isServer) {
			config.resolve.fallback = {
				fs: false,
				path: false,
			}
		}
		return config
	},
}

export default nextConfig
